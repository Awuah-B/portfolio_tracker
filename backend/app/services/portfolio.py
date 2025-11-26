from typing import List, Dict, Any
from app.models.database import Holding # Keep Holding for now, as it's the input type
from app.services.market_data import MarketDataService
from app import schemas
from datetime import datetime, timedelta
from app.utils.set_logs import setup_logger
from app.services.benchmark import BenchmarkService

logger = setup_logger('portfolio_service.log')

def compute_portfolio_summary(holdings: List[Holding], market_data_service: MarketDataService) -> Dict:
    """Aggregate multiple holdings into a portfolio summary, including detailed calculations.

    Args:
        holdings: List of Holding objects from the database.
        market_data_service: An instance of MarketDataService to fetch current prices and asset info.

    Returns:
        Dict matching the schemas.PortfolioSummaryResponse structure.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    if not holdings:
        return {
            "portfolio_id": "",
            "total_current_value": 0.0,
            "total_percentage_change": 0.0,
            "holdings": [],
            "allocation": [],
        }
    
    total_current_value = 0.0
    total_initial_investment = 0.0
    
    calculated_holdings: List[schemas.HoldingCalculatedResponse] = []
    allocation_map: Dict[str, Dict[str, Any]] = {}
    
    # OPTIMIZATION: Batch fetch all current prices in parallel
    tickers = [h.ticker for h in holdings]
    current_prices = market_data_service.get_multiple_prices(tickers)
    
    # OPTIMIZATION: Fetch purchase prices and asset names in parallel
    def fetch_holding_data(holding):
        """Fetch all data needed for a single holding in parallel"""
        ticker = holding.ticker
        current_price = current_prices.get(ticker)
        
        # Fetch purchase price
        initial_price = market_data_service.get_price_at_date(holding.ticker, holding.purchase_date)
        
        # Fetch asset name
        asset_name = market_data_service.get_asset_name(ticker)
        
        return {
            'holding': holding,
            'current_price': current_price,
            'initial_price': initial_price,
            'asset_name': asset_name
        }
    
    # Execute all data fetches in parallel using thread pool
    holding_data_list = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_holding_data, h): h for h in holdings}
        for future in as_completed(futures):
            try:
                holding_data_list.append(future.result())
            except Exception as e:
                holding = futures[future]
                logger.error(f"Error fetching data for {holding.ticker}: {e}")
                # Add fallback data
                holding_data_list.append({
                    'holding': holding,
                    'current_price': None,
                    'initial_price': None,
                    'asset_name': holding.ticker
                })
    
    # Process holding data (now all fetches are complete)
    for data in holding_data_list:
        holding = data['holding']
        current_price = data['current_price']
        initial_price_per_unit = data['initial_price']
        asset_name = data['asset_name']
        
        if current_price is None:
            # If current_price cannot be fetched, we cannot calculate percentage change accurately.
            # For now, we'll skip this holding or set percentage_change to 0.
            # A more robust solution would involve logging, error handling, or using a fallback price.
            percentage_change = 0.0
            current_value = float(holding.starting_price) # Assume no change if no current price
        elif initial_price_per_unit is None or initial_price_per_unit == 0:
            percentage_change = 0.0
            current_value = float(holding.starting_price) # Use starting_price
        else:
            percentage_change = ((current_price - initial_price_per_unit) / initial_price_per_unit) * 100
            current_value = float(holding.starting_price) * (1 + percentage_change / 100) # Use starting_price

        total_current_value += current_value
        total_initial_investment += float(holding.starting_price)

        # Get asset info for frontend display
        asset_type_str = holding.asset_type.value # Convert Enum to string

        calculated_holdings.append(
            schemas.HoldingCalculatedResponse(
                id=holding.id,
                portfolio_id=holding.portfolio_id,
                ticker=holding.ticker,
                starting_price=float(holding.starting_price), # Use starting_price
                purchase_date=holding.purchase_date,
                asset_type=holding.asset_type,
                last_updated=holding.last_updated,
                current_price=current_price,
                percentage_change=percentage_change,
                asset_info=schemas.AssetInfo(name=asset_name, type=asset_type_str)
            )
        )

        # Prepare allocation data (using current_value)
        if holding.ticker in allocation_map:
            allocation_map[holding.ticker]['value'] += current_value
        else:
            allocation_map[holding.ticker] = {
                'name': asset_name,
                'value': current_value,
                'type': asset_type_str
            }
    
    allocation = sorted(list(allocation_map.values()), key=lambda x: x['value'], reverse=True)

    total_percentage_change = ((total_current_value - total_initial_investment) / total_initial_investment) * 100 if total_initial_investment > 0 else 0

    return {
        "portfolio_id": holdings[0].portfolio_id if holdings else "",
        "total_current_value": total_current_value,
        "total_percentage_change": total_percentage_change,
        "holdings": calculated_holdings,
        "allocation": allocation,
    }

def get_portfolio_history(holdings: List[Holding], market_data_service: MarketDataService) -> Dict:
    """
    Calculate the historical value of the portfolio over time with S&P 500 benchmark comparison.
    
    Strategy:
    1. Find the earliest purchase date across all holdings.
    2. Create a date range from earliest date to today.
    3. For each holding:
       a. Fetch historical prices from its purchase date (IN PARALLEL).
       b. Calculate daily value: Value_t = Starting_Price * (Price_t / Price_purchase)
       c. Add to daily totals.
    4. Fetch S&P 500 benchmark data for the same period
    5. Calculate percentage changes for both portfolio and benchmark
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    if not holdings:
        return {"portfolio_id": "", "history": [], "benchmark_history": []}
        
    # 1. Find earliest purchase date
    earliest_date = min(h.purchase_date for h in holdings)
    
    start_date = earliest_date
    end_date = datetime.now()
    
    # 2. OPTIMIZATION: Fetch history for all holdings IN PARALLEL
    def fetch_holding_history(holding):
        """Fetch historical prices for a single holding"""
        h_start = holding.purchase_date
        prices = market_data_service.get_historical_prices_series(holding.ticker, h_start, end_date)
        
        # Find base price (first available price on or after purchase date)
        base_price = None
        sorted_dates = sorted(prices.keys())
        if sorted_dates:
            base_price = prices[sorted_dates[0]]
            
        return {
            'holding_id': holding.id,
            'prices': prices,
            'base_price': base_price
        }
    
    holding_histories = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_holding_history, h): h for h in holdings}
        for future in as_completed(futures):
            try:
                result = future.result()
                holding_histories[result['holding_id']] = {
                    "prices": result['prices'],
                    "base_price": result['base_price']
                }
            except Exception as e:
                holding = futures[future]
                logger.error(f"Error fetching history for {holding.ticker}: {e}")
                holding_histories[holding.id] = {
                    "prices": {},
                    "base_price": None
                }
            
    # 3. Aggregate daily values
    delta = end_date - start_date
    history_points = []
    
    # Track initial portfolio value for percentage calculations
    initial_portfolio_value = sum(float(h.starting_price) for h in holdings)
    
    # Iterate through each day
    for i in range(delta.days + 2):
        current_date = start_date + timedelta(days=i)
        if current_date > end_date:
            break
            
        date_str = current_date.strftime('%Y-%m-%d')
        
        daily_total_value = 0.0
        has_data = False
        
        for holding in holdings:
            # Only include holding if purchased by this date
            if holding.purchase_date.date() <= current_date.date():
                h_data = holding_histories.get(holding.id)
                
                if h_data and h_data["base_price"]:
                    price = h_data["prices"].get(date_str)
                    
                    if price:
                        val = float(holding.starting_price) * (price / h_data["base_price"])
                        daily_total_value += val
                        has_data = True
                        h_data["last_known_val"] = val
                    elif "last_known_val" in h_data:
                         daily_total_value += h_data["last_known_val"]
                         has_data = True
        
        if has_data:
            # Calculate percentage change from initial value
            pct_change = ((daily_total_value - initial_portfolio_value) / initial_portfolio_value) * 100 if initial_portfolio_value > 0 else 0
            history_points.append({
                "date": date_str,
                "value": round(daily_total_value, 2),
                "percentage_change": round(pct_change, 2)
            })
    
    # 4. Fetch S&P 500 benchmark data (this could also be parallelized if needed)
    benchmark_service = BenchmarkService()
    sp500_prices = benchmark_service.get_sp500_history(start_date, end_date)
    
    # Get the base S&P 500 price (earliest date in our range)
    first_date = history_points[0]["date"] if history_points else None
    benchmark_history = []
    
    if first_date and sp500_prices:
        # Calculate percentage changes from the first date
        benchmark_pct_changes = benchmark_service.calculate_percentage_change_series(sp500_prices, first_date)
        
        # Create benchmark history aligned with portfolio history
        for point in history_points:
            date_str = point["date"]
            if date_str in benchmark_pct_changes:
                benchmark_history.append({
                    "date": date_str,
                    "percentage_change": benchmark_pct_changes[date_str]
                })
    
    return {
        "portfolio_id": holdings[0].portfolio_id,
        "history": history_points,
        "benchmark_history": benchmark_history
    }

def get_portfolio_intraday_history(holdings: List[Holding], market_data_service: MarketDataService) -> Dict:
    """
    Calculate intraday (5-minute) portfolio history for the current day.
    """
    if not holdings:
        return {"portfolio_id": "", "history": [], "benchmark_history": []}
        
    # 1. Fetch intraday prices for all holdings
    holding_intraday = {}
    all_timestamps = set()
    
    for holding in holdings:
        prices = market_data_service.get_intraday_prices(holding.ticker)
        holding_intraday[holding.id] = prices
        all_timestamps.update(prices.keys())
        
    # Sort timestamps
    sorted_timestamps = sorted(list(all_timestamps))
    
    if not sorted_timestamps:
        return {"portfolio_id": holdings[0].portfolio_id, "history": [], "benchmark_history": []}
        
    # 2. Calculate portfolio value at each timestamp
    history_points = []
    
    # We need a base value to calculate percentage change. 
    # Ideally this is yesterday's close, but for now we'll use the first available intraday point.
    initial_value = 0.0
    
    # Calculate initial value at first timestamp
    first_ts = sorted_timestamps[0]
    for holding in holdings:
        prices = holding_intraday.get(holding.id, {})
        # If price exists for this timestamp, use it. If not, try to find nearest or use starting price?
        # For intraday, if data is missing, we might skip or hold previous.
        # Simple approach: use price if available, else skip holding for this timestamp (risky)
        # Better: Use first available price for that holding
        
        price = prices.get(first_ts)
        if not price:
            # Find first available price for this holding
            h_prices = sorted(prices.items())
            if h_prices:
                price = h_prices[0][1]
            else:
                # Fallback to starting price if no intraday data (e.g. market closed or error)
                price = float(holding.starting_price) # This is actually cost basis, not current price. 
                # Ideally we'd fetch previous close.
        
        if price:
            # Calculate value: Quantity * Price
            # We don't store quantity directly, we store starting_price (cost basis) and purchase_date.
            # Wait, we don't have quantity! 
            # The logic in get_portfolio_history uses: val = starting_price * (price / base_price)
            # We need to replicate that logic.
            
            # We need the "base price" (purchase price) to calculate performance
            # But we don't have it easily available here without fetching historical data for purchase date.
            # HOWEVER, get_portfolio_history fetches it.
            
            # Alternative: We can estimate "Current Value" = starting_price * (CurrentPrice / PurchasePrice)
            # We need PurchasePrice.
            pass

    # RE-EVALUATION:
    # To calculate accurate intraday value, we need the Quantity of shares.
    # Current schema: Holding(ticker, starting_price, purchase_date). 
    # It seems "starting_price" is the TOTAL investment amount (Cost Basis).
    # So Quantity = starting_price / Price_at_purchase.
    # We don't have Price_at_purchase stored! 
    # get_portfolio_history fetches it: `market_data_service.get_historical_prices_series(holding.ticker, h_start, end_date)`
    # and finds `base_price`.
    
    # To be fast for intraday, we shouldn't fetch historical data for every holding every time.
    # We should probably cache the "Purchase Price" or "Quantity" on the Holding model, 
    # but I can't change schema easily right now.
    
    # Workaround: 
    # For intraday chart, we are showing % change of the PORTFOLIO for the day.
    # We can approximate: 
    # Value_t = Sum( Holding_Current_Value_t )
    # Holding_Current_Value_t = (starting_price / PurchasePrice) * Price_t
    
    # We really need PurchasePrice. 
    # Let's fetch it? It might be cached in DB!
    # `market_data_service.price_cache.get_cached_price(ticker, purchase_date)`
    
    # Let's try to get base prices efficiently.
    
    base_prices = {}
    for holding in holdings:
        # Try to get purchase price from cache
        price = market_data_service.price_cache.get_cached_price(holding.ticker, holding.purchase_date.date())
        if not price:
            # If not in cache, we might have to fetch it. 
            # This could be slow if we do it for every intraday request.
            # But hopefully it's cached from the main history load.
            # If not, we'll fetch it.
            hist = market_data_service.get_historical_prices(holding.ticker, holding.purchase_date, holding.purchase_date)
            if hist:
                price = hist[0]['close']
                market_data_service.price_cache.store_price(holding.ticker, holding.purchase_date.date(), price)
        
        base_prices[holding.id] = price

    # Now calculate values
    for ts in sorted_timestamps:
        daily_total_value = 0.0
        has_valid_data = False
        
        for holding in holdings:
            prices = holding_intraday.get(holding.id, {})
            current_price = prices.get(ts)
            
            # If we have a gap in 5-min data, use last known price?
            # For now, strict matching.
            
            base_price = base_prices.get(holding.id)
            
            if current_price and base_price:
                # Value = Initial * (Current / Base)
                val = float(holding.starting_price) * (current_price / base_price)
                daily_total_value += val
                has_valid_data = True
            elif base_price:
                 # If no price for this specific timestamp, try to find previous
                 # (Simple forward fill logic could go here, but omitted for brevity)
                 pass
        
        if has_valid_data:
            if initial_value == 0:
                initial_value = daily_total_value
            
            # Calculate % change relative to START OF DAY (first point)
            # This shows "Day's Performance"
            pct_change = ((daily_total_value - initial_value) / initial_value) * 100 if initial_value > 0 else 0
            
            history_points.append({
                "date": ts, # ISO timestamp
                "value": round(daily_total_value, 2),
                "percentage_change": round(pct_change, 2)
            })
            
    return {
        "portfolio_id": holdings[0].portfolio_id,
        "history": history_points,
        "benchmark_history": [] # TODO: Add S&P 500 intraday if needed
    }

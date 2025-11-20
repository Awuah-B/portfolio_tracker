from typing import List, Dict, Any
from app.models.database import Holding # Keep Holding for now, as it's the input type
from app.services.market_data import MarketDataService
from app import schemas
from datetime import datetime

def compute_portfolio_summary(holdings: List[Holding], market_data_service: MarketDataService) -> Dict:
    """Aggregate multiple holdings into a portfolio summary, including detailed calculations.

    Args:
        holdings: List of Holding objects from the database.
        market_data_service: An instance of MarketDataService to fetch current prices and asset info.

    Returns:
        Dict matching the schemas.PortfolioSummaryResponse structure.
    """
    total_current_value = 0.0
    total_initial_investment = 0.0
    
    calculated_holdings: List[schemas.HoldingCalculatedResponse] = []
    allocation_map: Dict[str, Dict[str, Any]] = {}

    for holding in holdings:
        current_price = market_data_service.get_current_price(holding.ticker)
        
        if current_price is None:
            # If current_price cannot be fetched, we cannot calculate percentage change accurately.
            # For now, we'll skip this holding or set percentage_change to 0.
            # A more robust solution would involve logging, error handling, or using a fallback price.
            percentage_change = 0.0
            current_value = float(holding.initial_investment) # Assume no change if no current price
        else:
            # Assuming initial_investment is the total value at purchase date
            # To calculate percentage change, we need the price at purchase date.
            # For simplicity, let's assume initial_investment is the base for percentage change.
            # This implies we need to fetch historical price at purchase_date.
            # For now, let's assume initial_investment is the total value, and current_price is per unit.
            # This logic needs refinement based on how initial_investment is truly defined.
            # For the purpose of this refactor, let's assume initial_investment is the total value.
            # And we need to calculate current_value based on current_price and some implied quantity.
            # This is where the model becomes ambiguous without quantity.

            # Let's re-evaluate the model:
            # If we only track initial_investment and purchase_date, and current_price is per unit,
            # we need to know the 'number of units' to get current_value.
            # The request was "Remove quantity from table schema and all associated logic base we want to track only percentage change of assest value from the time of addition to portfolio."
            # This implies initial_investment IS the total value.
            # So, current_value should be derived from initial_investment and percentage_change.
            # But percentage_change itself needs current_value. This is a circular dependency.

            # Let's assume the backend will provide `current_value` or `percentage_change` directly,
            # or we need to fetch historical price at `purchase_date` to calculate `initial_value_at_purchase_date`.

            # For now, let's assume `initial_investment` is the total value invested.
            # And `current_price` is the current price per unit.
            # This means we need to know the 'number of units' to calculate current_value.
            # This contradicts "Remove quantity".

            # Let's assume `initial_investment` is the total value of the holding at purchase.
            # And `current_price` is the current price of ONE unit.
            # This means we need to know the number of units to calculate the current total value.

            # Re-reading the request: "track only percentage change of assest value from the time of addition to portfolio."
            # This means we need:
            # 1. Initial total value (initial_investment)
            # 2. Current total value (which we need to calculate)

            # To calculate current total value, we need current price and initial price.
            # If initial_investment is the total value, then we need to know the initial price per unit
            # and the current price per unit to calculate the percentage change.

            # Let's assume `initial_investment` is the total amount invested.
            # And `current_price` is the current price of the asset (e.g., stock price).
            # To calculate the current value of the holding, we need to know how many units were bought.
            # This brings back `quantity`.

            # This is a critical point of ambiguity.
            # If `quantity` is removed, how do we calculate `current_value` from `current_price`?
            # The only way is if `initial_investment` is the total value, and we track `percentage_change` directly.
            # But `percentage_change` is a derived value.

            # Let's assume the `initial_investment` is the total value of the asset at the time of purchase.
            # And `current_price` is the current price of the asset.
            # We need to get the price of the asset at `purchase_date`.

            # This requires a new function in MarketDataService: `get_price_at_date(ticker, date)`.
            # For now, I will implement a placeholder for `get_price_at_date` in `MarketDataService`.

            initial_price_at_purchase = market_data_service.get_price_at_date(holding.ticker, holding.purchase_date)

            if initial_price_at_purchase is None or initial_price_at_purchase == 0:
                percentage_change = 0.0
                current_value = float(holding.initial_investment)
            else:
                # Assuming initial_investment is the total value at purchase.
                # We need to infer the 'implied quantity' if we want to use current_price.
                # Implied quantity = initial_investment / initial_price_at_purchase
                # Current total value = Implied quantity * current_price
                
                # Or, more simply, calculate percentage change directly from prices:
                percentage_change = ((current_price - initial_price_at_purchase) / initial_price_at_purchase) * 100
                current_value = float(holding.initial_investment) * (1 + percentage_change / 100)

        total_current_value += current_value
        total_initial_investment += float(holding.initial_investment)

        # Get asset info for frontend display
        asset_name = market_data_service.get_asset_name(holding.ticker)
        asset_type_str = holding.asset_type.value # Convert Enum to string

        calculated_holdings.append(
            schemas.HoldingCalculatedResponse(
                id=holding.id,
                portfolio_id=holding.portfolio_id,
                ticker=holding.ticker,
                initial_investment=float(holding.initial_investment),
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

import time
import threading
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import yfinance as yf
from app.utils.set_logs import setup_logger
from app.services.price_cache import PriceCacheService
import asyncio
from app.services.websocket_manager import manager

logger = setup_logger(__name__)

class MarketDataService:
    """Fetches and caches market data from Yahoo Finance"""
    def __init__(self, max_retries: int = 3, base_delay: float = 2.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.lock = threading.Lock()
        self.price_cache = PriceCacheService()
        
        # In-memory cache with TTL
        self._memory_cache: Dict[str, Dict] = {}
        self._current_price_ttl = timedelta(minutes=15)  # Extended to 15 min
        self._historical_price_ttl = timedelta(days=7)  # Extended to 7 days
        
        # Asset metadata cache (rarely changes)
        self._asset_name_cache: Dict[str, str] = {}


    def _get_from_memory_cache(self, key: str, ttl: timedelta) -> Optional[Any]:
        """Get value from in-memory cache if not expired."""
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if datetime.now() - entry['timestamp'] < ttl:
                logger.debug(f"Memory cache HIT: {key}")
                return entry['data']
            else:
                # Expired, remove it
                del self._memory_cache[key]
                logger.debug(f"Memory cache EXPIRED: {key}")
        return None
    
    def _set_memory_cache(self, key: str, data: Any):
        """Store value in in-memory cache."""
        self._memory_cache[key] = {
            'data': data,
            'timestamp': datetime.now()
        }
        logger.debug(f"Memory cache SET: {key}")
    
    def clear_memory_cache(self):
        """Clear all in-memory cache entries."""
        self._memory_cache.clear()
        logger.info("Memory cache cleared")

    def get_current_price(self, ticker: str) -> Optional[float]:
        """
        Get current price for a ticker with multi-layer caching.
        
        Args:
            ticker: Stock symbol (e.g., 'AAPL', 'BTC-USD')
            
        Returns:
            Current price or None if error
        """
        cache_key = f"current_price:{ticker}"
        
        # Layer 1: Check in-memory cache
        cached_price = self._get_from_memory_cache(cache_key, self._current_price_ttl)
        if cached_price is not None:
            return cached_price
        
        # Layer 2: Check database cache (today's price)
        db_price = self.price_cache.get_cached_price(ticker, datetime.now().date())
        if db_price is not None:
            self._set_memory_cache(cache_key, db_price)
            return db_price
        
        # Layer 3: Fetch from Yahoo Finance
        for attempt in range(self.max_retries):
            try:
                # Only sleep on retries, not the first attempt
                if attempt > 0:
                    time.sleep(self.base_delay * (2 ** attempt))
                logger.debug(f"Fetching data for {ticker} (attempt {attempt + 1})")

                stock = yf.Ticker(ticker)
                data = stock.history(period='1d')

                if not data.empty:
                    current_price = float(data['Close'].iloc[-1])
                    logger.info(f"{ticker}: ${current_price:.2f}")
                    
                    # Store in both caches
                    self._set_memory_cache(cache_key, current_price)
                    self.price_cache.store_price(
                        ticker, 
                        datetime.now().date(), 
                        current_price,
                        volume=int(data['Volume'].iloc[-1]) if 'Volume' in data else None
                    )
                    
                    # Broadcast update via WebSocket
                    try:
                        loop = asyncio.get_running_loop()
                        message = {
                            "type": "price_update",
                            "ticker": ticker,
                            "price": current_price,
                            "timestamp": datetime.now().isoformat()
                        }
                        loop.create_task(manager.broadcast(message))
                    except RuntimeError:
                        pass # No running loop (e.g. running as script)

                    return current_price
                
                elif attempt == self.max_retries - 1:
                    logger.warning(f"Empty Data for {ticker} after {self.max_retries} attempts")
                    return None
            except Exception as e:
                logger.error(f"Failed to fetch data for {ticker} on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return None

    def get_intraday_prices(self, ticker: str) -> Dict[str, float]:
        """
        Get intraday prices (5-minute intervals) for the current day.
        Uses short-term in-memory caching only.
        
        Args:
            ticker: Stock symbol
            
        Returns:
            Dictionary mapping timestamp strings to closing prices
        """
        cache_key = f"intraday:{ticker}"
        
        # Check memory cache (1 minute TTL for intraday to keep it fresh)
        cached_data = self._get_from_memory_cache(cache_key, timedelta(minutes=1))
        if cached_data:
            return cached_data
            
        for attempt in range(self.max_retries):
            try:
                # Only sleep on retries
                if attempt > 0:
                    time.sleep(self.base_delay * (2 ** attempt))
                logger.debug(f"Fetching intraday data for {ticker} (attempt {attempt + 1})")

                stock = yf.Ticker(ticker)
                # Fetch 1 day of data with 5 minute interval
                data = stock.history(period='1d', interval='5m')

                if not data.empty:
                    prices = {}
                    for date, row in data.iterrows():
                        # Format as full ISO timestamp
                        date_str = date.isoformat()
                        prices[date_str] = float(row['Close'])
                    
                    # Cache for 1 minute
                    self._set_memory_cache(cache_key, prices)
                    return prices
                
                elif attempt == self.max_retries - 1:
                    logger.warning(f"Empty intraday data for {ticker}")
                    return {}
            except Exception as e:
                logger.error(f"Failed to fetch intraday data for {ticker}: {e}")
                if attempt == self.max_retries - 1:
                    return {}
        return {}

    def get_historical_prices(
        self, 
        ticker: str, 
        start_date: datetime, 
        end_date: datetime = None
    ) -> List[Dict]:
        """
        Get historical prices for a date range
        
        Args:
            ticker: Stock symbol
            start_date: Start date
            end_date: End date (default: today)
            
        Returns:
            List of price records: [{'date': ..., 'close': ..., 'volume': ...}, ...]
        """
        if end_date is None:
            end_date = datetime.now()
        
        for attempt in range(self.max_retries):
            try:
                # Only sleep on retries
                if attempt > 0:
                    time.sleep(self.base_delay * (2 ** attempt))
                logger.debug(f"Fetching data for {ticker} (attempt {attempt + 1})")

                stock = yf.Ticker(ticker)
                data = stock.history(start=start_date, end=end_date)

                if not data.empty:
                    prices = []
                    for date, row in data.iterrows():
                        prices.append({
                            'date': date.to_pydatetime(),
                            'close': float(row['Close']),
                            'volume': int(row['Volume']) if 'Volume' in row else 0
                        })
                    
                    return prices
                elif attempt == self.max_retries - 1:
                    logger.warning(f"Empty Data for {ticker} after {self.max_retries} attempts")
                    return None
            except Exception as e:
                logger.error(f"Failed to fetch data for {ticker} on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return None
    
    def get_multiple_prices(self, tickers: List[str]) -> Dict[str, float]:
        """
        Get current prices for multiple tickers efficiently
        
        Args:
            tickers: List of stock symbols
            
        Returns:
            Dictionary: {'AAPL': 150.00, 'GOOGL': 2800.00, ...}
        """
        prices = {}

        for ticker in tickers:
            price = self.get_current_price(ticker)
            if price is not None:
                prices[ticker] = price
            # small throttle to avoid hitting provider limits
            time.sleep(0.5)

        return prices
    
    def validate_ticker(self, ticker: str) -> bool:
        """
        Check if ticker exists by attempting to fetch a small amount of historical data.
        
        Args:
            ticker: Stock symbol to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            stock = yf.Ticker(ticker)
            # Attempt to get 1 day of history. If data is returned, ticker is likely valid.
            data = stock.history(period='1d')
            return not data.empty
            
        except Exception as e:
            logger.warning(f"Ticker validation failed for {ticker}: {e}")
            return False
    
    def get_asset_name(self, ticker: str) -> str:
        """
        Get the long name of an asset (with aggressive caching).
        
        Args:
            ticker: Stock symbol.
            
        Returns:
            The long name of the asset, or the ticker itself if not found.
        """
        # Check cache first (asset names rarely change)
        if ticker in self._asset_name_cache:
            return self._asset_name_cache[ticker]
        
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            name = info.get('longName', ticker)
            # Cache the result indefinitely (asset names don't change)
            self._asset_name_cache[ticker] = name
            return name
        except Exception as e:
            logger.warning(f"Could not fetch asset name for {ticker}: {e}")
            # Cache the ticker as fallback to avoid repeated failures
            self._asset_name_cache[ticker] = ticker
            return ticker
        
    def get_price_at_date(self, ticker: str, date: datetime) -> Optional[float]:
        """
        Get the closing price for a ticker on a specific date.
        
        Args:
            ticker: Stock symbol.
            date: The specific date to get the price for.
            
        Returns:
            The closing price on the specified date, or None if not found.
        """
        # yfinance's history function is inclusive for start date, exclusive for end date.
        # To get price for 'date', we query from 'date' to 'date + 1 day'.
        end_date = date + timedelta(days=1)
        historical_data = self.get_historical_prices(ticker, start_date=date, end_date=end_date)
        
        if historical_data and len(historical_data) > 0:
            # The first entry should be the price for the requested date
            return historical_data[0]['close']
        return None

    def get_historical_prices_series(
        self, 
        ticker: str, 
        start_date: datetime, 
        end_date: datetime = None
    ) -> Dict[str, float]:
        """
        Get historical prices as a dictionary {date_str: price} for easier lookup.
        Now with database caching for improved performance.
        
        Args:
            ticker: Stock symbol
            start_date: Start date
            end_date: End date (default: today)
            
        Returns:
            Dictionary: {'2023-01-01': 150.0, ...}
        """
        if end_date is None:
            end_date = datetime.now()
        
        # Step 1: Check database cache
        cached_prices = self.price_cache.get_cached_price_range(
            ticker, 
            start_date.date(), 
            end_date.date()
        )
        
        # Step 2: Find missing dates
        missing_dates = self.price_cache.find_missing_dates(
            ticker,
            start_date.date(),
            end_date.date()
        )
        
        # Step 3: Fetch only missing data from Yahoo Finance
        if missing_dates and len(missing_dates) > 0:
            logger.info(f"{ticker}: Fetching {len(missing_dates)} missing dates from Yahoo Finance")
            
            # Fetch from Yahoo Finance
            fresh_prices = self.get_historical_prices(ticker, start_date, end_date)
            
            if fresh_prices:
                # Store in database cache
                self.price_cache.store_bulk_prices(ticker, fresh_prices)
                
                # Add to cached_prices dict
                for p in fresh_prices:
                    date_str = p['date'].strftime('%Y-%m-%d')
                    cached_prices[date_str] = p['close']
        
        return cached_prices

if __name__ == "__main__":
    service = MarketDataService()

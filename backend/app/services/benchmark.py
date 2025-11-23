"""
Benchmark service for fetching and caching market benchmark data (e.g., S&P 500).
"""
from typing import Dict, Optional
from datetime import datetime, timedelta
import yfinance as yf
from app.utils.set_logs import setup_logger

logger = setup_logger('benchmark_service.log')

class BenchmarkService:
    """Service for fetching benchmark index data like S&P 500."""
    
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._cache_duration = timedelta(hours=1)  # Cache for 1 hour
    
    def get_sp500_history(self, start_date: datetime, end_date: datetime) -> Dict[str, float]:
        """
        Fetch S&P 500 historical prices for the given date range.
        
        Args:
            start_date: Start date for historical data
            end_date: End date for historical data
            
        Returns:
            Dictionary mapping date strings (YYYY-MM-DD) to closing prices
        """
        cache_key = f"^GSPC_{start_date.date()}_{end_date.date()}"
        
        # Check cache
        if cache_key in self._cache:
            cached_data = self._cache[cache_key]
            if datetime.now() - cached_data['timestamp'] < self._cache_duration:
                logger.debug(f"Returning cached S&P 500 data for {cache_key}")
                return cached_data['data']
        
        try:
            logger.info(f"Fetching S&P 500 data from {start_date.date()} to {end_date.date()}")
            
            # Fetch data from Yahoo Finance
            ticker = yf.Ticker("^GSPC")
            hist = ticker.history(start=start_date, end=end_date + timedelta(days=1))
            
            # Convert to dictionary format
            prices = {}
            for date, row in hist.iterrows():
                date_str = date.strftime('%Y-%m-%d')
                prices[date_str] = float(row['Close'])
            
            # Cache the result
            self._cache[cache_key] = {
                'data': prices,
                'timestamp': datetime.now()
            }
            
            logger.info(f"Successfully fetched {len(prices)} S&P 500 data points")
            return prices
            
        except Exception as e:
            logger.error(f"Error fetching S&P 500 data: {e}")
            return {}
    
    def calculate_percentage_change_series(
        self, 
        prices: Dict[str, float], 
        base_date: str
    ) -> Dict[str, float]:
        """
        Calculate percentage change series from a base date.
        
        Args:
            prices: Dictionary of date -> price
            base_date: The base date to calculate percentage change from
            
        Returns:
            Dictionary of date -> percentage change from base
        """
        if not prices or base_date not in prices:
            return {}
        
        base_price = prices[base_date]
        if base_price == 0:
            return {}
        
        percentage_changes = {}
        for date, price in prices.items():
            pct_change = ((price - base_price) / base_price) * 100
            percentage_changes[date] = round(pct_change, 2)
        
        return percentage_changes

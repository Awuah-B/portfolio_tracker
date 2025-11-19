import time
import threading
from typing import Optional, Dict, Any, List
from datetime import datetime
import yfinance as yf
from set_logs import setup_logger

logger = setup_logger(__name__)

class MarketDataService:
    """Fetches and caches market data from Yahoo Finance"""
    def __init__(self, max_retries: int = 3, base_delay: float = 2.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.lock = threading.Lock()


    def get_current_price(self, ticker: str) -> Optional[float]:
        """
        Get current price for a ticker
        
        Args:
            ticker: Stock symbol (e.g., 'AAPL', 'BTC-USD')
            
        Returns:
            Current price or None if error
        """
        for attempt in range(self.max_retries):
            try:
                time.sleep(self.base_delay * (2 ** attempt))
                logger.debug(f"Fetching data for {ticker} (attempt {attempt + 1})")

                stock = yf.Ticker(ticker)
                data = stock.history(period='1d')

                if not data.empty:
                    current_price = data['Close'].iloc[-1]
                    logger.info(f"{ticker}: ${current_price:.2f}")
                    return float(current_price)
                
                elif attempt == self.max_retries - 1:
                    logger.warning(f"Empty Data for {ticker} after {self.max_retries} attempts")
                    return None
            except Exception as e:
                logger.error(f"Failed to fetch data for {ticker} on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return None

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
            if price:
                prices[ticker] = price
            time.sleep(0.5) 
    
    def validate_ticker(self, ticker: str) -> bool:
        """
        Check if ticker exists
        
        Args:
            ticker: Stock symbol to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # If we can get basic info, ticker is valid
            return 'symbol' in info or 'regularMarketPrice' in info
            
        except:
            return False
        
if __name__ == "__main__":
    service = MarketDataService()

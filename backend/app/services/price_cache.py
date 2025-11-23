"""
Price cache service for storing and retrieving cached market data from the database.
"""
from typing import List, Dict, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.database import PriceCache, SessionLocal
from app.utils.set_logs import setup_logger
import uuid

logger = setup_logger('price_cache.log')

class PriceCacheService:
    """Service for managing database-level price caching."""
    
    def __init__(self):
        self._retention_days = 90  # Keep cache for 90 days
    
    def get_cached_price(self, ticker: str, target_date: date, db: Session = None) -> Optional[float]:
        """
        Retrieve a cached price for a specific ticker and date.
        
        Args:
            ticker: Stock symbol
            target_date: The date to get the price for
            db: Optional database session
            
        Returns:
            Closing price or None if not cached
        """
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
            
        try:
            # Convert date to datetime for comparison
            start_dt = datetime.combine(target_date, datetime.min.time())
            end_dt = datetime.combine(target_date, datetime.max.time())
            
            cached = db.query(PriceCache).filter(
                and_(
                    PriceCache.ticker == ticker,
                    PriceCache.date >= start_dt,
                    PriceCache.date <= end_dt
                )
            ).first()
            
            if cached:
                logger.debug(f"Cache HIT: {ticker} on {target_date}")
                return float(cached.close_price)
            
            logger.debug(f"Cache MISS: {ticker} on {target_date}")
            return None
            
        finally:
            if should_close:
                db.close()
    
    def get_cached_price_range(
        self, 
        ticker: str, 
        start_date: date, 
        end_date: date,
        db: Session = None
    ) -> Dict[str, float]:
        """
        Retrieve cached prices for a date range.
        
        Args:
            ticker: Stock symbol
            start_date: Start date
            end_date: End date
            db: Optional database session
            
        Returns:
            Dictionary mapping date strings (YYYY-MM-DD) to prices
        """
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
            
        try:
            start_dt = datetime.combine(start_date, datetime.min.time())
            end_dt = datetime.combine(end_date, datetime.max.time())
            
            cached_prices = db.query(PriceCache).filter(
                and_(
                    PriceCache.ticker == ticker,
                    PriceCache.date >= start_dt,
                    PriceCache.date <= end_dt
                )
            ).order_by(PriceCache.date).all()
            
            result = {}
            for price in cached_prices:
                date_str = price.date.strftime('%Y-%m-%d')
                result[date_str] = float(price.close_price)
            
            if result:
                logger.info(f"Cache HIT: {ticker} - found {len(result)} cached prices")
            else:
                logger.info(f"Cache MISS: {ticker} - no cached prices found")
                
            return result
            
        finally:
            if should_close:
                db.close()
    
    def store_price(
        self, 
        ticker: str, 
        price_date: date, 
        close_price: float,
        volume: Optional[int] = None,
        db: Session = None
    ) -> bool:
        """
        Store a single price in the cache.
        
        Args:
            ticker: Stock symbol
            price_date: Date of the price
            close_price: Closing price
            volume: Trading volume (optional)
            db: Optional database session
            
        Returns:
            True if stored successfully
        """
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
            
        try:
            # Convert date to datetime
            price_dt = datetime.combine(price_date, datetime.min.time())
            
            # Check if already exists
            existing = db.query(PriceCache).filter(
                and_(
                    PriceCache.ticker == ticker,
                    PriceCache.date == price_dt
                )
            ).first()
            
            if existing:
                # Update existing
                existing.close_price = close_price
                if volume is not None:
                    existing.volume = volume
                logger.debug(f"Updated cache: {ticker} on {price_date}")
            else:
                # Insert new
                new_cache = PriceCache(
                    id=str(uuid.uuid4()),
                    ticker=ticker,
                    date=price_dt,
                    close_price=close_price,
                    volume=volume
                )
                db.add(new_cache)
                logger.debug(f"Stored in cache: {ticker} on {price_date}")
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error storing price in cache: {e}")
            db.rollback()
            return False
            
        finally:
            if should_close:
                db.close()
    
    def store_bulk_prices(
        self, 
        ticker: str, 
        prices: List[Dict],
        db: Session = None
    ) -> int:
        """
        Store multiple prices in bulk.
        
        Args:
            ticker: Stock symbol
            prices: List of dicts with 'date', 'close', and optionally 'volume'
            db: Optional database session
            
        Returns:
            Number of prices stored
        """
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
            
        try:
            stored_count = 0
            
            for price_data in prices:
                price_date = price_data['date']
                if isinstance(price_date, datetime):
                    price_date = price_date.date()
                    
                close_price = price_data['close']
                volume = price_data.get('volume')
                
                if self.store_price(ticker, price_date, close_price, volume, db):
                    stored_count += 1
            
            logger.info(f"Bulk stored {stored_count} prices for {ticker}")
            return stored_count
            
        finally:
            if should_close:
                db.close()
    
    def find_missing_dates(
        self, 
        ticker: str,
        start_date: date, 
        end_date: date,
        db: Session = None
    ) -> List[date]:
        """
        Find dates that are missing from the cache.
        
        Args:
            ticker: Stock symbol
            start_date: Start date
            end_date: End date
            db: Optional database session
            
        Returns:
            List of dates that need to be fetched
        """
        cached = self.get_cached_price_range(ticker, start_date, end_date, db)
        cached_dates = set(datetime.strptime(d, '%Y-%m-%d').date() for d in cached.keys())
        
        # Generate all dates in range
        all_dates = []
        current = start_date
        while current <= end_date:
            all_dates.append(current)
            current += timedelta(days=1)
        
        # Find missing dates
        missing = [d for d in all_dates if d not in cached_dates]
        
        if missing:
            logger.info(f"{ticker}: {len(missing)} dates missing from cache")
        
        return missing
    
    def cleanup_old_cache(self, days: int = None, db: Session = None) -> int:
        """
        Remove cache entries older than specified days.
        
        Args:
            days: Number of days to retain (default: self._retention_days)
            db: Optional database session
            
        Returns:
            Number of entries deleted
        """
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
            
        try:
            if days is None:
                days = self._retention_days
                
            cutoff_date = datetime.now() - timedelta(days=days)
            
            deleted = db.query(PriceCache).filter(
                PriceCache.created_at < cutoff_date
            ).delete()
            
            db.commit()
            logger.info(f"Cleaned up {deleted} old cache entries")
            return deleted
            
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")
            db.rollback()
            return 0
            
        finally:
            if should_close:
                db.close()
    
    def invalidate_cache(self, ticker: str, target_date: date = None, db: Session = None) -> int:
        """
        Invalidate (delete) cached prices for a ticker.
        
        Args:
            ticker: Stock symbol
            target_date: Specific date to invalidate (None = all dates)
            db: Optional database session
            
        Returns:
            Number of entries deleted
        """
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
            
        try:
            query = db.query(PriceCache).filter(PriceCache.ticker == ticker)
            
            if target_date:
                start_dt = datetime.combine(target_date, datetime.min.time())
                end_dt = datetime.combine(target_date, datetime.max.time())
                query = query.filter(
                    and_(
                        PriceCache.date >= start_dt,
                        PriceCache.date <= end_dt
                    )
                )
            
            deleted = query.delete()
            db.commit()
            
            logger.info(f"Invalidated {deleted} cache entries for {ticker}")
            return deleted
            
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
            db.rollback()
            return 0
            
        finally:
            if should_close:
                db.close()

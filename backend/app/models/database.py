from sqlalchemy import create_engine, Column, String, Numeric, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime, timezone
import enum
import os

from app.utils.set_logs import setup_logger
from app.exceptions import ConfigurationError
from app.config import CONFIG
logger = setup_logger('database.log')


DATABASE_URL = CONFIG.database_url
if not DATABASE_URL:
    raise ConfigurationError("Required environment variable DATABASE_URL is not set. Set it to your database connection URL.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class AssetType(str, enum.Enum):
    STOCK = "stock"
    CRYPTO = "crypto"
    ETF = "etf"
    COMMODITIES = "commodities"
    BONDS = "bonds"
    

class TradeType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # One portfolio -> many holdings
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")

class Holding(Base):
    __tablename__ = "holdings"

    id = Column(String, primary_key=True)
    portfolio_id = Column(String, ForeignKey("portfolios.id", ondelete="CASCADE"))
    ticker = Column(String, nullable=False, index=True)
    initial_investment = Column(Numeric(20, 2))
    purchase_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    asset_type = Column(Enum(AssetType), nullable=False)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Many holdings -> one portfolio
    portfolio = relationship("Portfolio", back_populates="holdings")
    trades = relationship("Trade", back_populates="holding", cascade="all, delete-orphan")

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(String, primary_key=True)
    holding_id = Column(String, ForeignKey("holdings.id", ondelete="CASCADE"))
    ticker = Column(String, nullable=False)
    trade_type = Column(Enum(TradeType), nullable=False)
    quantity = Column(Numeric(20, 8))
    price = Column(Numeric(20, 2), nullable=False)
    trade_date = Column(DateTime, nullable=False)
    commission = Column(Numeric(10, 2), default=0)
    notes = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    holding = relationship("Holding", back_populates="trades")

class PriceCache(Base):
    __tablename__ = "price_cache"
    
    id = Column(String, primary_key=True)
    ticker = Column(String, nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    close_price = Column(Numeric(20, 2), nullable=False)
    volume = Column(Numeric(20, 0))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (UniqueConstraint('ticker', 'date', name='_ticker_date_uc'),)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    logger.info("✅ Database tables created successfully!")


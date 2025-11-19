from sqlalchemy import create_engine, Column, String, Numeric, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime, timezone
import enum
import os
from dotenv import load_dotenv

from set_logs import setup_logger

logger = setup_logger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class AssetType(str, enum.Enum):
    STOCK = "stock"
    CRYPTO = "crypto"
    ETF = "etf"

class TradeType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    holdings = relationship("Holding", back_populates="portfolios", cascade="all, delete-orphan")

class Holdings(Base):
    __tablename__ = "holdings"

    id = Column(String, primary_key=True)
    portfolio_id = Column(String, ForeignKey("portfolios.id", ondelete="CASCADE"))
    ticker = Column(String, nullable=False, index=True)
    quantity = Column(Numeric(20, 8))
    avg_cost = Column(Numeric(20, 2))
    asset_type = Column(Enum(AssetType), nullable=False)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

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

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    logger.info("✅ Database tables created successfully!")


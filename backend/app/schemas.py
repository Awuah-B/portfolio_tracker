from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.database import AssetType

class AssetInfo(BaseModel):
    name: str
    type: str

class HoldingBase(BaseModel):
    ticker: str
    starting_price: float # Renamed from initial_investment
    purchase_date: datetime
    asset_type: AssetType

class HoldingCreate(HoldingBase):
    portfolio_id: str

class HoldingCreateRequest(BaseModel): # This will be used for the API input
    ticker: str
    starting_price: float
    purchase_date: datetime
    asset_type: AssetType
    trade_type: str = "buy"  # "buy" or "sell"

class HoldingUpdate(BaseModel):
    starting_price: Optional[float] = None # Renamed from initial_investment
    purchase_date: Optional[datetime] = None

class HoldingCalculatedResponse(HoldingBase):
    id: str
    portfolio_id: str
    current_price: Optional[float] = None
    last_updated: datetime
    percentage_change: float
    trade_type: Optional[str] = "buy"  # Include trade_type in response
    asset_info: Optional[AssetInfo] = None

    class Config:
        from_attributes = True

class AllocationItem(BaseModel):
    name: str
    value: float
    type: str

class PortfolioSummaryResponse(BaseModel):
    portfolio_id: str
    total_current_value: float
    total_percentage_change: float
    holdings: List[HoldingCalculatedResponse]
    allocation: List[AllocationItem]

class PortfolioCreate(BaseModel):
    name: str

class PortfolioResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PortfolioHistoryPoint(BaseModel):
    date: str
    value: float
    percentage_change: float

class BenchmarkHistoryPoint(BaseModel):
    date: str
    percentage_change: float

class PortfolioHistoryResponse(BaseModel):
    portfolio_id: str
    history: List[PortfolioHistoryPoint]
    benchmark_history: List[BenchmarkHistoryPoint]

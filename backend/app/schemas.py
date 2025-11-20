from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.database import AssetType

class AssetInfo(BaseModel):
    name: str
    type: str

class HoldingBase(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    asset_type: AssetType

class HoldingCreate(HoldingBase):
    portfolio_id: str

class HoldingUpdate(BaseModel):
    quantity: Optional[float] = None
    avg_cost: Optional[float] = None

class HoldingCalculatedResponse(HoldingBase):
    id: str
    portfolio_id: str
    current_price: Optional[float] = None
    last_updated: datetime
    position_value: float
    cost_basis: float
    unrealised_gain: float
    unrealised_gain_percent: float
    asset_info: Optional[AssetInfo] = None

    class Config:
        from_attributes = True

class PortfolioSummaryResponse(BaseModel):
    portfolio_id: str
    total_value: float
    total_cost_basis: float
    total_unrealised_gain: float
    total_unrealised_gain_percent: float
    holdings: List[HoldingCalculatedResponse]
    allocation: List['AllocationItem']

class AllocationItem(BaseModel):
    name: str
    value: float
    type: str

class PortfolioCreate(BaseModel):
    name: str

class PortfolioResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

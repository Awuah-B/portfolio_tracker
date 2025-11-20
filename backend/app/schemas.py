from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.database import AssetType

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

class HoldingResponse(HoldingBase):
    id: str
    portfolio_id: str
    current_price: Optional[float] = None
    last_updated: datetime

    class Config:
        from_attributes = True

class PortfolioSummaryResponse(BaseModel):
    portfolio_id: str
    total_value: float
    total_cost_basis: float
    total_unrealised_gain: float
    holdings: list

class PortfolioCreate(BaseModel):
    name: str

class PortfolioResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db, Holding, Portfolio, AssetType
from app.models.database import get_db, Holding, Portfolio, AssetType
from app.services.portfolio import (
    compute_portfolio_summary, 
    get_portfolio_history as service_get_portfolio_history,
    get_portfolio_intraday_history as service_get_portfolio_intraday_history
)
from app.services.market_data import MarketDataService
from app import schemas
import uuid
from typing import List
from datetime import datetime # Import datetime

router = APIRouter()
market_data_service = MarketDataService()

from app.api.auth import get_current_admin

@router.post("/portfolios", response_model=schemas.PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(portfolio: schemas.PortfolioCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_portfolio = Portfolio(id=str(uuid.uuid4()), name=portfolio.name)
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio

@router.get("/portfolios", response_model=List[schemas.PortfolioResponse])
async def get_all_portfolios(db: Session = Depends(get_db)):
    portfolios = db.query(Portfolio).all()
    return portfolios

@router.get("/portfolios/{portfolio_id}", response_model=schemas.PortfolioSummaryResponse)
async def get_portfolio(portfolio_id: str, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()

    summary = compute_portfolio_summary(holdings, market_data_service)
    return schemas.PortfolioSummaryResponse(**summary)

@router.get("/portfolios/{portfolio_id}/history", response_model=schemas.PortfolioHistoryResponse)
async def get_portfolio_history(
    portfolio_id: str, 
    period: str = "all",
    db: Session = Depends(get_db)
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
    
    if period == "1d":
        history = service_get_portfolio_intraday_history(holdings, market_data_service)
    else:
        history = service_get_portfolio_history(holdings, market_data_service)
    return schemas.PortfolioHistoryResponse(**history)

@router.delete("/portfolios/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(portfolio_id: str, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not db_portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    
    db.delete(db_portfolio)
    db.commit()
    return {"message": "Portfolio deleted successfully"}

@router.post("/portfolios/{portfolio_id}/holdings", response_model=schemas.HoldingCalculatedResponse, status_code=status.HTTP_201_CREATED)
async def add_holding_to_portfolio(
    portfolio_id: str,
    holding_request: schemas.HoldingCreateRequest, # Use the new schema
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    # Validate ticker before adding
    if not market_data_service.validate_ticker(holding_request.ticker):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid ticker symbol: {holding_request.ticker}")

    db_holding = Holding(
        id=str(uuid.uuid4()),
        portfolio_id=portfolio_id,
        ticker=holding_request.ticker,
        starting_price=holding_request.starting_price,
        purchase_date=holding_request.purchase_date,
        asset_type=holding_request.asset_type,
        trade_type=holding_request.trade_type
    )
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)

    current_price = market_data_service.get_current_price(db_holding.ticker)
    return schemas.HoldingCalculatedResponse( # Corrected schema
        id=db_holding.id,
        portfolio_id=db_holding.portfolio_id,
        ticker=db_holding.ticker,
        starting_price=float(db_holding.starting_price), # Use starting_price
        purchase_date=db_holding.purchase_date,
        asset_type=db_holding.asset_type,
        trade_type=db_holding.trade_type,
        last_updated=db_holding.last_updated,
        current_price=current_price,
        percentage_change=0.0 # Placeholder, will be calculated in summary
    )

@router.put("/holdings/{holding_id}", response_model=schemas.HoldingCalculatedResponse)
async def update_holding(
    holding_id: str,
    holding_update: schemas.HoldingUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    if holding_update.starting_price is not None: # Use starting_price
        db_holding.starting_price = holding_update.starting_price
    if holding_update.purchase_date is not None:
        db_holding.purchase_date = holding_update.purchase_date
    
    db.commit()
    db.refresh(db_holding)

    current_price = market_data_service.get_current_price(db_holding.ticker)
    return schemas.HoldingCalculatedResponse( # Corrected schema
        id=db_holding.id,
        portfolio_id=db_holding.portfolio_id,
        ticker=db_holding.ticker,
        starting_price=float(db_holding.starting_price), # Use starting_price
        purchase_date=db_holding.purchase_date,
        asset_type=db_holding.asset_type,
        trade_type=db_holding.trade_type,
        last_updated=db_holding.last_updated,
        current_price=current_price,
        percentage_change=0.0 # Placeholder, will be calculated in summary
    )

@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(holding_id: str, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    db.delete(db_holding)
    db.commit()
    return {"message": "Holding deleted successfully"}

@router.get("/market_data/current_price/{ticker}", response_model=float)
async def get_current_price_for_ticker(ticker: str):
    price = market_data_service.get_current_price(ticker)
    if price is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Could not fetch current price for {ticker}")
    return price

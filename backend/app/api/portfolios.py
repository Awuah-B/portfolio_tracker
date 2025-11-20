from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db, Holding, Portfolio, AssetType
from app.services.portfolio import compute_portfolio_summary
from app.services.market_data import MarketDataService
from app import schemas
import uuid
from typing import List

router = APIRouter()
market_data_service = MarketDataService()

@router.post("/portfolios", response_model=schemas.PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(portfolio: schemas.PortfolioCreate, db: Session = Depends(get_db)):
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

@router.delete("/portfolios/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(portfolio_id: str, db: Session = Depends(get_db)):
    db_portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not db_portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    
    db.delete(db_portfolio)
    db.commit()
    return {"message": "Portfolio deleted successfully"}

@router.post("/portfolios/{portfolio_id}/holdings", response_model=schemas.HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding_to_portfolio(
    portfolio_id: str,
    holding: schemas.HoldingBase,
    db: Session = Depends(get_db)
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    # Validate ticker before adding
    if not market_data_service.validate_ticker(holding.ticker):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid ticker symbol: {holding.ticker}")

    db_holding = Holding(
        id=str(uuid.uuid4()),
        portfolio_id=portfolio_id,
        ticker=holding.ticker,
        quantity=holding.quantity,
        avg_cost=holding.avg_cost,
        asset_type=holding.asset_type
    )
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)

    current_price = market_data_service.get_current_price(db_holding.ticker)
    return schemas.HoldingResponse(
        id=db_holding.id,
        portfolio_id=db_holding.portfolio_id,
        ticker=db_holding.ticker,
        quantity=float(db_holding.quantity),
        avg_cost=float(db_holding.avg_cost),
        asset_type=db_holding.asset_type,
        last_updated=db_holding.last_updated,
        current_price=current_price
    )

@router.put("/holdings/{holding_id}", response_model=schemas.HoldingResponse)
async def update_holding(
    holding_id: str,
    holding_update: schemas.HoldingUpdate,
    db: Session = Depends(get_db)
):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    if holding_update.quantity is not None:
        db_holding.quantity = holding_update.quantity
    if holding_update.avg_cost is not None:
        db_holding.avg_cost = holding_update.avg_cost
    
    db.commit()
    db.refresh(db_holding)

    current_price = market_data_service.get_current_price(db_holding.ticker)
    return schemas.HoldingResponse(
        id=db_holding.id,
        portfolio_id=db_holding.portfolio_id,
        ticker=db_holding.ticker,
        quantity=float(db_holding.quantity),
        avg_cost=float(db_holding.avg_cost),
        asset_type=db_holding.asset_type,
        last_updated=db_holding.last_updated,
        current_price=current_price
    )

@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(holding_id: str, db: Session = Depends(get_db)):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    db.delete(db_holding)
    db.commit()
    return {"message": "Holding deleted successfully"}

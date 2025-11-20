from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, Holding
from app.services.portfolio import compute_portfolio_summary
from app.services.market_data import MarketDataService

router = APIRouter()
market_data_service = MarketDataService()

@router.get("/portfolios/{portfolio_id}")
async def get_portfolio(portfolio_id: str, db: Session = Depends(get_db)):
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()

    holdings_data = []
    for holding in holdings:
        current_price = market_data_service.get_current_price(holding.ticker)
        if current_price is not None:
            holdings_data.append({
                "ticker": holding.ticker,
                "quantity": holding.quantity,
                "avg_cost": holding.avg_cost,
                "current_price": current_price,
            })

    summary = compute_portfolio_summary(holdings_data)
    return {"portfolio_id": portfolio_id, **summary}

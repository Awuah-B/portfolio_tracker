from sqlalchemy.orm import Session

from app.models.database import SessionLocal, Portfolio, Holding, AssetType

def seed_database():
    db: Session = SessionLocal()

    try:
        # Create a portfolio
        portfolio = Portfolio(id="my-portfolio", name="My Demo Portfolio")
        db.add(portfolio)
        db.commit()

        # Create holdings
        holdings = [
            Holding(id="h1", portfolio_id="my-portfolio", ticker="AAPL", quantity=10, avg_cost=150, asset_type=AssetType.STOCK),
            Holding(id="h2", portfolio_id="my-portfolio", ticker="GOOGL", quantity=5, avg_cost=2800, asset_type=AssetType.STOCK),
            Holding(id="h3", portfolio_id="my-portfolio", ticker="BTC-USD", quantity=0.5, avg_cost=60000, asset_type=AssetType.CRYPTO),
        ]
        for holding in holdings:
            db.add(holding)
        db.commit()

        print("Database seeded successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

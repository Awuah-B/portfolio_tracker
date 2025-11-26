from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
from starlette.middleware.cors import CORSMiddleware
from app.api import portfolios, auth
from app.models.database import SessionLocal, Holding
from app.services.market_data import MarketDataService
import asyncio

app = FastAPI(title="Portfolio Tracker API")

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.railway\.app|https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(portfolios.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Portfolio Tracker API"}

@app.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

market_data_service = MarketDataService()

async def update_prices_background():
    """Background task to update prices for all active holdings."""
    while True:
        try:
            # Create a new session for this iteration
            db = SessionLocal()
            try:
                # Get unique tickers from holdings
                holdings = db.query(Holding.ticker).distinct().all()
                tickers = [h.ticker for h in holdings]
            finally:
                db.close()
            
            if not tickers:
                await asyncio.sleep(10)
                continue

            # Update prices (this triggers WebSocket broadcast)
            for ticker in tickers:
                # Run in thread pool to avoid blocking the event loop
                await asyncio.to_thread(market_data_service.get_current_price, ticker)
                await asyncio.sleep(2) # Throttle
                
            # Wait before next cycle
            await asyncio.sleep(30) 
            
        except Exception as e:
            print(f"Background task error: {e}")
            await asyncio.sleep(30)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(update_prices_background())

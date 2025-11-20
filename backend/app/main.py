from fastapi import FastAPI
from app.api import portfolios

app = FastAPI(title="Portfolio Tracker API")

app.include_router(portfolios.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Portfolio Tracker API"}

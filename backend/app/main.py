from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="Portfolio Tracker API")

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolios.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Portfolio Tracker API"}

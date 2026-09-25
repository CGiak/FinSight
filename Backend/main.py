# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI(title="FinSight API")

# Allow React to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is running!"}

@app.get("/api/stock/{ticker}")
def get_stock_price(ticker: str):
    # Fetch free live data using yfinance
    stock = yf.Ticker(ticker)
    current_price = stock.fast_info['last_price']
    return {
        "ticker": ticker.upper(),
        "price": round(current_price, 2)
    }
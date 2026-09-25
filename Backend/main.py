# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import jwt
import yfinance as yf

# Import from our local files
from database import engine, Base, get_db
from models import User, Asset
from auth import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinSight API")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST SCHEMAS ---
class UserRegisterSchema(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLoginSchema(BaseModel):
    username: str
    password: str

class AssetCreateSchema(BaseModel):
    ticker: str

# --- AUTH DEPENDENCY ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- ROUTES ---
@app.post("/api/auth/register")
def register(user_data: UserRegisterSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email is already registered")

    hashed_pwd = hash_password(user_data.password)
    new_user = User(username=user_data.username, email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.username, "user_id": new_user.id})
    return {"token": token, "username": new_user.username}

@app.post("/api/auth/login")
def login(user_data: UserLoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": user.username, "user_id": user.id})
    return {"token": token, "username": user.username}

# --- PORTFOLIO ROUTES ---
@app.get("/api/portfolio")
def get_portfolio(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get all saved tickers for the logged-in user
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    portfolio_data = []
    
    # Fetch live prices for each saved ticker
    for asset in assets:
        try:
            stock = yf.Ticker(asset.ticker)
            price = stock.fast_info['last_price']
            portfolio_data.append({
                "id": asset.id,
                "ticker": asset.ticker,
                "price": round(price, 2)
            })
        except:
            continue
            
    return portfolio_data

@app.post("/api/portfolio")
def add_asset(asset_data: AssetCreateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ticker_upper = asset_data.ticker.upper()
    
    # 1. Verify the stock is real via yfinance before saving
    try:
        stock = yf.Ticker(ticker_upper)
        price = stock.fast_info['last_price']
    except:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")
        
    # 2. Check if the user is already tracking it
    existing = db.query(Asset).filter(Asset.user_id == current_user.id, Asset.ticker == ticker_upper).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset already in portfolio")

    # 3. Save to database
    new_asset = Asset(ticker=ticker_upper, user_id=current_user.id)
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    
    return {
        "id": new_asset.id,
        "ticker": new_asset.ticker,
        "price": round(price, 2)
    }
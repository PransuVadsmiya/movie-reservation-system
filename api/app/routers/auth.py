import json
import urllib.request
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.theater import Theater
from app.schemas.user import UserCreate, UserLogin, Token, UserOut, ForgotPasswordRequest, ResetPasswordRequest
from app.security import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    create_reset_password_token,
    verify_reset_password_token
)
from app.tasks import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/google/login")
def google_login():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)

@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    # 1. Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code"
    }
    data_encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(token_url, data=data_encoded, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            token_response = json.loads(response.read())
            access_token = token_response.get("access_token")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not validate credentials with Google")

    # 2. Get user info
    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    req_info = urllib.request.Request(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
    try:
        with urllib.request.urlopen(req_info) as response:
            user_info = json.loads(response.read())
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not fetch user info from Google")

    email = user_info.get("email")
    name = user_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="No email provided by Google")

    # 3. Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        import secrets
        hashed_password = get_password_hash(secrets.token_urlsafe(32))
        user = User(
            email=email,
            full_name=name,
            hashed_password=hashed_password,
            role=UserRole.user
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Generate JWT
    app_access_token = create_access_token(data={"sub": str(user.id)})
    
    # 5. Redirect to frontend
    return RedirectResponse(f"http://localhost:3001/login?token={app_access_token}")


@router.post("/signup", response_model=UserOut)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )


    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email, 
        full_name=user_in.full_name, 
        hashed_password=hashed_password,
        role=UserRole.admin if user_in.is_admin else UserRole.user
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user_in.is_admin and user_in.theater_name and user_in.theater_address:
        new_theater = Theater(
            name=user_in.theater_name,
            address=user_in.theater_address,
            admin_id=new_user.id
        )
        db.add(new_theater)
        db.commit()

    return new_user


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        token = create_reset_password_token(user.email)
        # Using the standard local frontend port since it's hardcoded elsewhere as well
        reset_url = f"http://localhost:3001/reset-password?token={token}"
        send_password_reset_email.delay(user.email, reset_url)
    
    # We return a generic message to avoid email enumeration
    return {"message": "If that email is in our system, we have sent a reset link."}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_reset_password_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    
    return {"message": "Password has been successfully reset."}

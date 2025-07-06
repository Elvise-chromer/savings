from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.session import get_db
from app.core.security import SecurityManager, get_current_user
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserResponse, Token, LoginRequest
from app.schemas.user import UserUpdate
import pyotp
import qrcode
import io
import base64

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check rate limiting
    client_ip = request.client.host
    if not SecurityManager.check_rate_limit(f"register:{client_ip}", 5):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = SecurityManager.hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password,
        role=user_data.role,
        phone_number=user_data.phone_number
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create audit log
    SecurityManager.create_audit_log(
        db, str(user.id), "CREATE", "user",
        {"action": "user_registration"}, client_ip
    )
    
    return UserResponse.from_orm(user)

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate user and return tokens"""
    client_ip = request.client.host
    
    # Check rate limiting
    if not SecurityManager.check_rate_limit(f"login:{client_ip}", 10):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts"
        )
    
    # Check login attempts for this email
    if not SecurityManager.check_login_attempts(login_data.email):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked due to too many failed attempts"
        )
    
    # Authenticate user
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not SecurityManager.verify_password(login_data.password, user.password_hash):
        SecurityManager.record_login_attempt(login_data.email, False)
        SecurityManager.create_audit_log(
            db, str(user.id) if user else None, "FAILED_LOGIN", "user",
            {"email": login_data.email}, client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Check 2FA if enabled
    if user.two_factor_enabled and not login_data.two_factor_code:
        raise HTTPException(
            status_code=status.HTTP_200_OK,
            detail="2FA code required",
            headers={"X-Require-2FA": "true"}
        )
    
    if user.two_factor_enabled and login_data.two_factor_code:
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(login_data.two_factor_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # Create tokens
    access_token = SecurityManager.create_access_token({"sub": str(user.id)})
    refresh_token = SecurityManager.create_refresh_token({"sub": str(user.id)})
    
    # Update user login info
    user.last_login = datetime.utcnow()
    user.failed_login_attempts = 0
    db.commit()
    
    # Record successful login
    SecurityManager.record_login_attempt(login_data.email, True)
    SecurityManager.create_audit_log(
        db, str(user.id), "LOGIN", "user",
        {"action": "successful_login"}, client_ip
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/enable-2fa")
async def enable_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enable two-factor authentication"""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    # Generate secret
    secret = pyotp.random_base32()
    
    # Generate QR code
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="Family Savings Tracker"
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_str = base64.b64encode(img_buffer.getvalue()).decode()
    
    # Store secret (temporarily)
    current_user.two_factor_secret = secret
    db.commit()
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{img_str}",
        "backup_codes": []  # Generate backup codes in production
    }

@router.post("/verify-2fa")
async def verify_2fa(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify and activate 2FA"""
    if not current_user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not initiated"
        )
    
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code"
        )
    
    current_user.two_factor_enabled = True
    db.commit()
    
    SecurityManager.create_audit_log(
        db, str(current_user.id), "ENABLE_2FA", "user",
        {"action": "2fa_enabled"}
    )
    
    return {"message": "2FA enabled successfully"}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    payload = SecurityManager.verify_token(refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token = SecurityManager.create_access_token({"sub": str(user.id)})
    new_refresh_token = SecurityManager.create_refresh_token({"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout user"""
    SecurityManager.create_audit_log(
        db, str(current_user.id), "LOGOUT", "user",
        {"action": "user_logout"}
    )
    
    return {"message": "Logged out successfully"}
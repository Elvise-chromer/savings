from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.PARENT
    phone_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    two_factor_code: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    phone_number: Optional[str]
    is_active: bool
    is_verified: bool
    two_factor_enabled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
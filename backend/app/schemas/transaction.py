from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType, TransactionMethod, TransactionStatus

class TransactionCreate(BaseModel):
    goal_id: str
    amount: Decimal
    transaction_type: TransactionType
    method: TransactionMethod
    description: Optional[str] = None
    phone_number: Optional[str] = None
    paybill_number: Optional[str] = None
    account_number: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class MPesaPaymentRequest(BaseModel):
    goal_id: str
    amount: Decimal
    phone_number: str
    paybill_number: str = "522522"
    account_number: str
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        # Basic Kenyan phone number validation
        if not v.startswith('254') or len(v) != 12:
            raise ValueError('Invalid phone number format. Use 254XXXXXXXXX')
        return v

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    goal_id: str
    amount: Decimal
    transaction_type: TransactionType
    method: TransactionMethod
    status: TransactionStatus
    description: Optional[str]
    reference_number: Optional[str]
    mpesa_reference: Optional[str]
    phone_number: Optional[str]
    transaction_fee: Decimal
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True
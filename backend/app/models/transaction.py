from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base
import uuid
from datetime import datetime
import enum

class TransactionType(str, enum.Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"

class TransactionMethod(str, enum.Enum):
    MPESA = "mpesa"
    BANK = "bank"
    CASH = "cash"
    CARD = "card"

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    
    amount = Column(Numeric(12, 2), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    method = Column(Enum(TransactionMethod), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    
    description = Column(Text)
    reference_number = Column(String(100))
    mpesa_reference = Column(String(100))
    
    # M-Pesa specific fields
    phone_number = Column(String(20))
    paybill_number = Column(String(20))
    account_number = Column(String(100))
    
    # Fees and charges
    transaction_fee = Column(Numeric(8, 2), default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    goal = relationship("Goal", back_populates="transactions")
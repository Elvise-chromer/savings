from sqlalchemy import Column, String, DateTime, Boolean, Enum, Numeric, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base
import uuid
from datetime import datetime
import enum

class GoalCategory(str, enum.Enum):
    EDUCATION = "education"
    VACATION = "vacation"
    EMERGENCY = "emergency"
    TOYS = "toys"
    ELECTRONICS = "electronics"
    OTHER = "other"

class GoalPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class GoalStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0)
    target_date = Column(DateTime, nullable=False)
    category = Column(Enum(GoalCategory), nullable=False)
    priority = Column(Enum(GoalPriority), default=GoalPriority.MEDIUM)
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    
    # Progress tracking
    milestones = Column(Text)  # JSON string of milestone data
    auto_save_amount = Column(Numeric(12, 2))
    auto_save_frequency = Column(String(20))  # daily, weekly, monthly
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="goals")
    transactions = relationship("Transaction", back_populates="goal")
    goal_shares = relationship("GoalShare", back_populates="goal")

class GoalShare(Base):
    __tablename__ = "goal_shares"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    permission_level = Column(String(20), default="view")  # view, contribute, manage
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    goal = relationship("Goal", back_populates="goal_shares")
    shared_with_user = relationship("User")
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base
import uuid
from datetime import datetime
import enum

class NotificationType(str, enum.Enum):
    GOAL_MILESTONE = "goal_milestone"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    GOAL_COMPLETED = "goal_completed"
    SECURITY_ALERT = "security_alert"
    SYSTEM_UPDATE = "system_update"

class NotificationPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    
    # Delivery channels
    send_email = Column(Boolean, default=True)
    send_sms = Column(Boolean, default=False)
    send_push = Column(Boolean, default=True)
    
    # Metadata
    data = Column(JSON)  # Additional data for the notification
    
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime)
    sent_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
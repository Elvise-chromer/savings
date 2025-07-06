from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.goal import GoalCategory, GoalPriority, GoalStatus

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_amount: Decimal
    target_date: datetime
    category: GoalCategory
    priority: GoalPriority = GoalPriority.MEDIUM
    auto_save_amount: Optional[Decimal] = None
    auto_save_frequency: Optional[str] = None
    
    @validator('target_amount')
    def validate_target_amount(cls, v):
        if v <= 0:
            raise ValueError('Target amount must be positive')
        return v
    
    @validator('target_date')
    def validate_target_date(cls, v):
        if v <= datetime.now():
            raise ValueError('Target date must be in the future')
        return v

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[Decimal] = None
    target_date: Optional[datetime] = None
    category: Optional[GoalCategory] = None
    priority: Optional[GoalPriority] = None
    status: Optional[GoalStatus] = None
    auto_save_amount: Optional[Decimal] = None
    auto_save_frequency: Optional[str] = None

class GoalResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    target_amount: Decimal
    current_amount: Decimal
    target_date: datetime
    category: GoalCategory
    priority: GoalPriority
    status: GoalStatus
    progress_percentage: float
    days_remaining: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    
    @validator('progress_percentage', pre=True, always=True)
    def calculate_progress(cls, v, values):
        if 'current_amount' in values and 'target_amount' in values:
            return min((float(values['current_amount']) / float(values['target_amount'])) * 100, 100)
        return 0
    
    @validator('days_remaining', pre=True, always=True)
    def calculate_days_remaining(cls, v, values):
        if 'target_date' in values:
            return max((values['target_date'] - datetime.now()).days, 0)
        return 0
    
    class Config:
        from_attributes = True

class GoalAnalytics(BaseModel):
    goal_id: str
    progress_percentage: float
    days_remaining: int
    daily_required_savings: float
    monthly_average_savings: float
    projected_completion_date: datetime
    is_on_track: bool
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

class MonthlyTrend(BaseModel):
    month: str
    amount: float

class CategoryBreakdown(BaseModel):
    category: str
    current_amount: float
    target_amount: float
    percentage: float

class SavingsAnalytics(BaseModel):
    total_savings: float
    total_target: float
    overall_progress: float
    active_goals: int
    completed_goals: int
    monthly_savings_rate: float
    monthly_trends: List[MonthlyTrend]
    category_breakdown: List[CategoryBreakdown]

class GoalProgressAnalytics(BaseModel):
    goal_id: str
    goal_title: str
    current_amount: float
    target_amount: float
    progress_percentage: float
    days_remaining: int
    daily_required_savings: float
    daily_average_savings: float
    predicted_completion_date: datetime
    is_on_track: bool
    velocity_trend: str

class SpendingAnalytics(BaseModel):
    period_days: int
    total_deposits: float
    total_withdrawals: float
    net_savings: float
    average_transaction_size: float
    transaction_count: int
    method_breakdown: Dict[str, Dict[str, Any]]
    peak_saving_day: int
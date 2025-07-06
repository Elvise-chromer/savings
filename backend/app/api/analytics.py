from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime, timedelta
from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.schemas.analytics import (
    SavingsAnalytics, GoalProgressAnalytics, SpendingAnalytics,
    MonthlyTrend, CategoryBreakdown
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/savings-overview", response_model=SavingsAnalytics)
async def get_savings_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive savings analytics"""
    
    # Total savings across all goals
    total_savings = db.query(func.sum(Goal.current_amount)).filter(
        Goal.user_id == current_user.id
    ).scalar() or 0
    
    # Total target amount
    total_target = db.query(func.sum(Goal.target_amount)).filter(
        Goal.user_id == current_user.id
    ).scalar() or 0
    
    # Active goals count
    active_goals = db.query(func.count(Goal.id)).filter(
        Goal.user_id == current_user.id,
        Goal.status == "active"
    ).scalar() or 0
    
    # Completed goals count
    completed_goals = db.query(func.count(Goal.id)).filter(
        Goal.user_id == current_user.id,
        Goal.status == "completed"
    ).scalar() or 0
    
    # Monthly savings trend (last 12 months)
    monthly_trends = []
    for i in range(12):
        month_start = datetime.now().replace(day=1) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=31)
        
        monthly_deposits = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "deposit",
            Transaction.status == "completed",
            Transaction.created_at >= month_start,
            Transaction.created_at < month_end
        ).scalar() or 0
        
        monthly_trends.append(MonthlyTrend(
            month=month_start.strftime("%Y-%m"),
            amount=float(monthly_deposits)
        ))
    
    # Category breakdown
    category_data = db.query(
        Goal.category,
        func.sum(Goal.current_amount).label("total_saved"),
        func.sum(Goal.target_amount).label("total_target")
    ).filter(
        Goal.user_id == current_user.id
    ).group_by(Goal.category).all()
    
    category_breakdown = [
        CategoryBreakdown(
            category=cat.category,
            current_amount=float(cat.total_saved or 0),
            target_amount=float(cat.total_target or 0),
            percentage=(float(cat.total_saved or 0) / float(cat.total_target or 1)) * 100
        )
        for cat in category_data
    ]
    
    # Calculate savings rate (last 3 months average)
    three_months_ago = datetime.now() - timedelta(days=90)
    recent_deposits = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "deposit",
        Transaction.status == "completed",
        Transaction.created_at >= three_months_ago
    ).scalar() or 0
    
    monthly_savings_rate = float(recent_deposits) / 3
    
    return SavingsAnalytics(
        total_savings=float(total_savings),
        total_target=float(total_target),
        overall_progress=(float(total_savings) / float(total_target)) * 100 if total_target > 0 else 0,
        active_goals=active_goals,
        completed_goals=completed_goals,
        monthly_savings_rate=monthly_savings_rate,
        monthly_trends=monthly_trends[::-1],  # Reverse to show oldest first
        category_breakdown=category_breakdown
    )

@router.get("/goal-progress", response_model=List[GoalProgressAnalytics])
async def get_goal_progress_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed progress analytics for each goal"""
    
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    analytics = []
    
    for goal in goals:
        # Calculate days remaining
        days_remaining = (goal.target_date - datetime.now()).days
        
        # Calculate required daily savings
        remaining_amount = goal.target_amount - goal.current_amount
        daily_required = float(remaining_amount) / max(days_remaining, 1) if days_remaining > 0 else 0
        
        # Get recent transaction velocity (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_deposits = db.query(func.sum(Transaction.amount)).filter(
            Transaction.goal_id == goal.id,
            Transaction.transaction_type == "deposit",
            Transaction.status == "completed",
            Transaction.created_at >= thirty_days_ago
        ).scalar() or 0
        
        daily_average = float(recent_deposits) / 30
        
        # Predict completion date based on current velocity
        if daily_average > 0:
            days_to_complete = float(remaining_amount) / daily_average
            predicted_completion = datetime.now() + timedelta(days=days_to_complete)
        else:
            predicted_completion = goal.target_date
        
        # Determine if on track
        is_on_track = daily_average >= daily_required if daily_required > 0 else True
        
        analytics.append(GoalProgressAnalytics(
            goal_id=str(goal.id),
            goal_title=goal.title,
            current_amount=float(goal.current_amount),
            target_amount=float(goal.target_amount),
            progress_percentage=(float(goal.current_amount) / float(goal.target_amount)) * 100,
            days_remaining=days_remaining,
            daily_required_savings=daily_required,
            daily_average_savings=daily_average,
            predicted_completion_date=predicted_completion,
            is_on_track=is_on_track,
            velocity_trend="increasing" if daily_average > daily_required else "decreasing"
        ))
    
    return analytics

@router.get("/spending-patterns", response_model=SpendingAnalytics)
async def get_spending_analytics(
    period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending pattern analytics"""
    
    start_date = datetime.now() - timedelta(days=period_days)
    
    # Total deposits and withdrawals
    deposits = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "deposit",
        Transaction.status == "completed",
        Transaction.created_at >= start_date
    ).scalar() or 0
    
    withdrawals = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "withdrawal",
        Transaction.status == "completed",
        Transaction.created_at >= start_date
    ).scalar() or 0
    
    # Transaction count by method
    method_breakdown = db.query(
        Transaction.method,
        func.count(Transaction.id).label("count"),
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.status == "completed",
        Transaction.created_at >= start_date
    ).group_by(Transaction.method).all()
    
    # Average transaction size
    avg_transaction = db.query(func.avg(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.status == "completed",
        Transaction.created_at >= start_date
    ).scalar() or 0
    
    # Peak spending days (day of week analysis)
    day_analysis = db.query(
        extract('dow', Transaction.created_at).label('day_of_week'),
        func.sum(Transaction.amount).label('total_amount'),
        func.count(Transaction.id).label('transaction_count')
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.status == "completed",
        Transaction.created_at >= start_date
    ).group_by(extract('dow', Transaction.created_at)).all()
    
    return SpendingAnalytics(
        period_days=period_days,
        total_deposits=float(deposits),
        total_withdrawals=float(withdrawals),
        net_savings=float(deposits) - float(withdrawals),
        average_transaction_size=float(avg_transaction),
        transaction_count=len(method_breakdown),
        method_breakdown={
            method.method: {
                "count": method.count,
                "total": float(method.total)
            }
            for method in method_breakdown
        },
        peak_saving_day=max(day_analysis, key=lambda x: x.total_amount).day_of_week if day_analysis else 0
    )

@router.get("/family-comparison")
async def get_family_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compare savings performance with family members"""
    
    # Get all family members (simplified - in production, you'd have family groups)
    family_members = db.query(User).filter(User.id != current_user.id).all()
    
    comparison_data = []
    
    for member in family_members:
        member_savings = db.query(func.sum(Goal.current_amount)).filter(
            Goal.user_id == member.id
        ).scalar() or 0
        
        member_goals = db.query(func.count(Goal.id)).filter(
            Goal.user_id == member.id,
            Goal.status == "active"
        ).scalar() or 0
        
        comparison_data.append({
            "user_id": str(member.id),
            "name": member.name,
            "total_savings": float(member_savings),
            "active_goals": member_goals
        })
    
    # Add current user data
    user_savings = db.query(func.sum(Goal.current_amount)).filter(
        Goal.user_id == current_user.id
    ).scalar() or 0
    
    user_goals = db.query(func.count(Goal.id)).filter(
        Goal.user_id == current_user.id,
        Goal.status == "active"
    ).scalar() or 0
    
    comparison_data.append({
        "user_id": str(current_user.id),
        "name": current_user.name + " (You)",
        "total_savings": float(user_savings),
        "active_goals": user_goals
    })
    
    return {
        "family_comparison": sorted(comparison_data, key=lambda x: x["total_savings"], reverse=True)
    }
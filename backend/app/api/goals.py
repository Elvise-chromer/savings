from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.core.security import get_current_user, SecurityManager
from app.models.user import User
from app.models.goal import Goal, GoalStatus, GoalShare
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalAnalytics
from datetime import datetime, timedelta
from sqlalchemy import func, and_

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new savings goal"""
    goal = Goal(
        user_id=current_user.id,
        title=goal_data.title,
        description=goal_data.description,
        target_amount=goal_data.target_amount,
        target_date=goal_data.target_date,
        category=goal_data.category,
        priority=goal_data.priority,
        auto_save_amount=goal_data.auto_save_amount,
        auto_save_frequency=goal_data.auto_save_frequency
    )
    
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    # Create audit log
    SecurityManager.create_audit_log(
        db, str(current_user.id), "CREATE", "goal",
        {"goal_id": str(goal.id), "title": goal.title}
    )
    
    return GoalResponse.from_orm(goal)

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    status: Optional[GoalStatus] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's goals with filtering"""
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    
    if status:
        query = query.filter(Goal.status == status)
    if category:
        query = query.filter(Goal.category == category)
    
    goals = query.offset(skip).limit(limit).all()
    return [GoalResponse.from_orm(goal) for goal in goals]

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific goal"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    return GoalResponse.from_orm(goal)

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update goal"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Update fields
    update_data = goal_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    goal.updated_at = datetime.utcnow()
    
    # Check if goal is completed
    if goal.current_amount >= goal.target_amount and goal.status != GoalStatus.COMPLETED:
        goal.status = GoalStatus.COMPLETED
        goal.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(goal)
    
    # Create audit log
    SecurityManager.create_audit_log(
        db, str(current_user.id), "UPDATE", "goal",
        {"goal_id": str(goal.id), "changes": update_data}
    )
    
    return GoalResponse.from_orm(goal)

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete goal"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Create audit log before deletion
    SecurityManager.create_audit_log(
        db, str(current_user.id), "DELETE", "goal",
        {"goal_id": str(goal.id), "title": goal.title}
    )
    
    db.delete(goal)
    db.commit()
    
    return {"message": "Goal deleted successfully"}

@router.get("/{goal_id}/analytics", response_model=GoalAnalytics)
async def get_goal_analytics(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get goal analytics and insights"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Calculate analytics
    progress_percentage = (goal.current_amount / goal.target_amount) * 100
    days_remaining = (goal.target_date - datetime.utcnow()).days
    
    # Calculate required daily savings
    remaining_amount = goal.target_amount - goal.current_amount
    daily_required = remaining_amount / max(days_remaining, 1) if days_remaining > 0 else 0
    
    # Get transaction history for trend analysis
    transactions = db.query(Transaction).filter(
        Transaction.goal_id == goal_id,
        Transaction.status == "completed"
    ).order_by(Transaction.created_at.desc()).limit(30).all()
    
    # Calculate average monthly savings
    monthly_avg = 0
    if transactions:
        total_deposits = sum(t.amount for t in transactions if t.transaction_type == "deposit")
        months = len(set((t.created_at.year, t.created_at.month) for t in transactions))
        monthly_avg = total_deposits / max(months, 1)
    
    return GoalAnalytics(
        goal_id=str(goal.id),
        progress_percentage=progress_percentage,
        days_remaining=days_remaining,
        daily_required_savings=daily_required,
        monthly_average_savings=monthly_avg,
        projected_completion_date=goal.target_date,
        is_on_track=daily_required <= monthly_avg / 30 if monthly_avg > 0 else False
    )

@router.post("/{goal_id}/share")
async def share_goal(
    goal_id: str,
    shared_with_email: str,
    permission_level: str = "view",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share goal with another family member"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Find user to share with
    shared_user = db.query(User).filter(User.email == shared_with_email).first()
    if not shared_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already shared
    existing_share = db.query(GoalShare).filter(
        GoalShare.goal_id == goal_id,
        GoalShare.shared_with_user_id == shared_user.id
    ).first()
    
    if existing_share:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal already shared with this user"
        )
    
    # Create share
    goal_share = GoalShare(
        goal_id=goal.id,
        shared_with_user_id=shared_user.id,
        permission_level=permission_level
    )
    
    db.add(goal_share)
    db.commit()
    
    # Create audit log
    SecurityManager.create_audit_log(
        db, str(current_user.id), "SHARE", "goal",
        {
            "goal_id": str(goal.id),
            "shared_with": shared_with_email,
            "permission": permission_level
        }
    )
    
    return {"message": "Goal shared successfully"}
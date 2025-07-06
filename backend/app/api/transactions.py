from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.core.security import get_current_user, SecurityManager
from app.models.user import User
from app.models.transaction import Transaction, TransactionStatus
from app.models.goal import Goal
from app.schemas.transaction import TransactionCreate, TransactionResponse, MPesaPaymentRequest
from app.services.mpesa import MPesaService
from app.services.notifications import NotificationService
from datetime import datetime

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction_data: TransactionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction"""
    # Verify goal exists and user has access
    goal = db.query(Goal).filter(
        Goal.id == transaction_data.goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Create transaction
    transaction = Transaction(
        user_id=current_user.id,
        goal_id=transaction_data.goal_id,
        amount=transaction_data.amount,
        transaction_type=transaction_data.transaction_type,
        method=transaction_data.method,
        description=transaction_data.description,
        phone_number=transaction_data.phone_number,
        paybill_number=transaction_data.paybill_number,
        account_number=transaction_data.account_number
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Process payment if it's M-Pesa
    if transaction_data.method == "mpesa":
        background_tasks.add_task(
            process_mpesa_payment,
            transaction.id,
            transaction_data.phone_number,
            transaction_data.amount,
            db
        )
    
    # Create audit log
    SecurityManager.create_audit_log(
        db, str(current_user.id), "CREATE", "transaction",
        {
            "transaction_id": str(transaction.id),
            "amount": float(transaction.amount),
            "method": transaction.method
        }
    )
    
    return TransactionResponse.from_orm(transaction)

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    goal_id: Optional[str] = None,
    status: Optional[TransactionStatus] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's transactions"""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if goal_id:
        query = query.filter(Transaction.goal_id == goal_id)
    if status:
        query = query.filter(Transaction.status == status)
    
    transactions = query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
    return [TransactionResponse.from_orm(t) for t in transactions]

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific transaction"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return TransactionResponse.from_orm(transaction)

@router.post("/mpesa/payment")
async def initiate_mpesa_payment(
    payment_data: MPesaPaymentRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate M-Pesa payment"""
    # Verify goal
    goal = db.query(Goal).filter(
        Goal.id == payment_data.goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Create transaction record
    transaction = Transaction(
        user_id=current_user.id,
        goal_id=payment_data.goal_id,
        amount=payment_data.amount,
        transaction_type="deposit",
        method="mpesa",
        phone_number=payment_data.phone_number,
        paybill_number=payment_data.paybill_number,
        account_number=payment_data.account_number,
        description=f"M-Pesa payment to {goal.title}"
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Initiate M-Pesa payment
    mpesa_service = MPesaService()
    try:
        result = await mpesa_service.initiate_stk_push(
            phone_number=payment_data.phone_number,
            amount=payment_data.amount,
            account_reference=payment_data.account_number,
            transaction_desc=f"Payment to {goal.title}"
        )
        
        transaction.reference_number = result.get("CheckoutRequestID")
        db.commit()
        
        # Schedule status check
        background_tasks.add_task(
            check_mpesa_payment_status,
            transaction.id,
            result.get("CheckoutRequestID"),
            db
        )
        
        return {
            "message": "Payment initiated successfully",
            "transaction_id": str(transaction.id),
            "checkout_request_id": result.get("CheckoutRequestID")
        }
        
    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment initiation failed: {str(e)}"
        )

async def process_mpesa_payment(transaction_id: str, phone_number: str, amount: float, db: Session):
    """Background task to process M-Pesa payment"""
    # This would integrate with actual M-Pesa API
    # For demo purposes, we'll simulate success after a delay
    import asyncio
    await asyncio.sleep(5)  # Simulate processing time
    
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if transaction:
        transaction.status = TransactionStatus.COMPLETED
        transaction.processed_at = datetime.utcnow()
        transaction.mpesa_reference = f"MP{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Update goal amount
        goal = db.query(Goal).filter(Goal.id == transaction.goal_id).first()
        if goal:
            goal.current_amount += transaction.amount
            goal.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Send notification
        notification_service = NotificationService()
        await notification_service.send_payment_success_notification(
            transaction.user_id, transaction.amount, goal.title
        )

async def check_mpesa_payment_status(transaction_id: str, checkout_request_id: str, db: Session):
    """Check M-Pesa payment status"""
    # This would check actual M-Pesa API status
    # For demo, we'll mark as completed after delay
    import asyncio
    await asyncio.sleep(10)
    
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if transaction and transaction.status == TransactionStatus.PENDING:
        transaction.status = TransactionStatus.COMPLETED
        transaction.processed_at = datetime.utcnow()
        db.commit()
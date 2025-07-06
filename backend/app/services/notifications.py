import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.core.config import settings
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from sqlalchemy.orm import Session
import httpx
import json

class NotificationService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
    
    async def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False):
        """Send email notification"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'html' if is_html else 'plain'))
            
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            
            text = msg.as_string()
            server.sendmail(self.smtp_user, to_email, text)
            server.quit()
            
            return True
        except Exception as e:
            print(f"Email sending failed: {e}")
            return False
    
    async def send_sms(self, phone_number: str, message: str):
        """Send SMS notification (integrate with SMS provider)"""
        # This would integrate with an SMS provider like Twilio, Africa's Talking, etc.
        # For demo purposes, we'll just log the message
        print(f"SMS to {phone_number}: {message}")
        return True
    
    async def create_notification(
        self,
        db: Session,
        user_id: str,
        title: str,
        message: str,
        notification_type: NotificationType,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        data: dict = None,
        send_email: bool = True,
        send_sms: bool = False
    ) -> Notification:
        """Create and optionally send notification"""
        
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            data=data or {},
            send_email=send_email,
            send_sms=send_sms
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # Send notification if requested
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            if send_email and user.email:
                await self.send_email(user.email, title, message, is_html=True)
            
            if send_sms and user.phone_number:
                await self.send_sms(user.phone_number, f"{title}: {message}")
            
            notification.is_sent = True
            notification.sent_at = datetime.utcnow()
            db.commit()
        
        return notification
    
    async def send_payment_success_notification(
        self,
        db: Session,
        user_id: str,
        amount: float,
        goal_title: str
    ):
        """Send payment success notification"""
        title = "Payment Successful!"
        message = f"""
        <h2>Payment Confirmed</h2>
        <p>Your payment of <strong>KES {amount:,.2f}</strong> to your goal 
        "<strong>{goal_title}</strong>" has been processed successfully.</p>
        <p>Keep up the great work on your savings journey!</p>
        """
        
        await self.create_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.PAYMENT_SUCCESS,
            priority=NotificationPriority.MEDIUM,
            data={"amount": amount, "goal_title": goal_title}
        )
    
    async def send_goal_milestone_notification(
        self,
        db: Session,
        user_id: str,
        goal_title: str,
        milestone_percentage: int,
        current_amount: float,
        target_amount: float
    ):
        """Send goal milestone notification"""
        title = f"🎉 {milestone_percentage}% Goal Achieved!"
        message = f"""
        <h2>Milestone Reached!</h2>
        <p>Congratulations! You've reached <strong>{milestone_percentage}%</strong> 
        of your goal "<strong>{goal_title}</strong>".</p>
        <p>Current progress: <strong>KES {current_amount:,.2f}</strong> of 
        <strong>KES {target_amount:,.2f}</strong></p>
        <p>You're doing amazing! Keep saving to reach your target.</p>
        """
        
        await self.create_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.GOAL_MILESTONE,
            priority=NotificationPriority.HIGH,
            data={
                "goal_title": goal_title,
                "milestone_percentage": milestone_percentage,
                "current_amount": current_amount,
                "target_amount": target_amount
            }
        )
    
    async def send_goal_completed_notification(
        self,
        db: Session,
        user_id: str,
        goal_title: str,
        final_amount: float
    ):
        """Send goal completion notification"""
        title = "🏆 Goal Completed!"
        message = f"""
        <h2>Congratulations!</h2>
        <p>You've successfully completed your goal "<strong>{goal_title}</strong>"!</p>
        <p>Final amount saved: <strong>KES {final_amount:,.2f}</strong></p>
        <p>This is a fantastic achievement. Time to set your next savings goal!</p>
        """
        
        await self.create_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.GOAL_COMPLETED,
            priority=NotificationPriority.HIGH,
            data={"goal_title": goal_title, "final_amount": final_amount},
            send_sms=True  # Important milestone, send SMS too
        )
    
    async def send_security_alert(
        self,
        db: Session,
        user_id: str,
        alert_type: str,
        details: str,
        ip_address: str = None
    ):
        """Send security alert notification"""
        title = "🔒 Security Alert"
        message = f"""
        <h2>Security Alert</h2>
        <p>We detected unusual activity on your account:</p>
        <p><strong>Alert Type:</strong> {alert_type}</p>
        <p><strong>Details:</strong> {details}</p>
        {f'<p><strong>IP Address:</strong> {ip_address}</p>' if ip_address else ''}
        <p>If this wasn't you, please contact support immediately.</p>
        """
        
        await self.create_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.SECURITY_ALERT,
            priority=NotificationPriority.URGENT,
            data={"alert_type": alert_type, "details": details, "ip_address": ip_address},
            send_email=True,
            send_sms=True  # Security alerts should go via multiple channels
        )
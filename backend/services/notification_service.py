from typing import Optional, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from backend.models.notification import Notification

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('FROM_EMAIL')
        self.admin_email = os.getenv('ADMIN_EMAIL')
        
    async def send_alert(
        self,
        title: str,
        message: str,
        severity: str = "medium",
        db: Optional[Session] = None
    ):
        """Send alert via email and store in database"""
        try:
            # Store notification in database if db session provided
            if db:
                notification = Notification(
                    title=title,
                    message=message,
                    severity=severity,
                    timestamp=datetime.utcnow()
                )
                db.add(notification)
                db.commit()
            
            # Send email
            if self.smtp_username and self.smtp_password:
                msg = MIMEMultipart()
                msg['From'] = self.from_email
                msg['To'] = self.admin_email
                msg['Subject'] = f"[{severity.upper()}] {title}"
                
                body = f"""
                Smart Irrigation System Alert
                
                Severity: {severity.upper()}
                Time: {datetime.utcnow()}
                
                {message}
                
                Please check the system dashboard for more details.
                """
                
                msg.attach(MIMEText(body, 'plain'))
                
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
                    
                logger.info(f"Alert sent: {title}")
            else:
                logger.warning("Email notifications not configured")
                
        except Exception as e:
            logger.error(f"Failed to send alert: {str(e)}")
    
    async def get_recent_alerts(
        self,
        db: Session,
        limit: int = 10,
        severity: Optional[str] = None
    ) -> List[Notification]:
        """Get recent alerts from database"""
        query = db.query(Notification).order_by(Notification.timestamp.desc())
        
        if severity:
            query = query.filter(Notification.severity == severity)
            
        return query.limit(limit).all()
    
    async def mark_alert_as_read(self, alert_id: int, db: Session):
        """Mark an alert as read"""
        notification = db.query(Notification).filter_by(id=alert_id).first()
        if notification:
            notification.read = True
            db.commit()
            return True
        return False

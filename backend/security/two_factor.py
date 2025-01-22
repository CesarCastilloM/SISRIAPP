import pyotp
import qrcode
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

class TwoFactorAuth:
    def __init__(self, app_name: str = "Smart Irrigation System"):
        self.app_name = app_name
        self._temp_secrets: Dict[str, Tuple[str, datetime]] = {}  # Store temporary secrets
        
    def generate_secret(self, user_email: str) -> Tuple[str, str]:
        """Generate a new TOTP secret and QR code for user"""
        # Generate random secret
        secret = pyotp.random_base32()
        
        # Create TOTP URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(user_email, issuer_name=self.app_name)
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        qr_code = base64.b64encode(buffered.getvalue()).decode()
        
        # Store temporary secret
        self._temp_secrets[user_email] = (secret, datetime.now() + timedelta(minutes=10))
        
        return secret, qr_code
        
    def verify_code(self, user_email: str, code: str, secret: Optional[str] = None) -> bool:
        """Verify TOTP code"""
        if not secret and user_email in self._temp_secrets:
            secret, expiry = self._temp_secrets[user_email]
            if datetime.now() > expiry:
                del self._temp_secrets[user_email]
                return False
                
        if not secret:
            return False
            
        totp = pyotp.TOTP(secret)
        return totp.verify(code)
        
    def cleanup_temp_secrets(self):
        """Clean up expired temporary secrets"""
        current_time = datetime.now()
        expired_emails = [
            email for email, (_, expiry) in self._temp_secrets.items()
            if current_time > expiry
        ]
        for email in expired_emails:
            del self._temp_secrets[email]
            
    def generate_backup_codes(self, count: int = 8) -> list[str]:
        """Generate backup codes for account recovery"""
        return [pyotp.random_base32()[:8] for _ in range(count)]
        
    def generate_recovery_token(self, user_email: str) -> str:
        """Generate a time-limited recovery token"""
        secret = pyotp.random_base32()
        self._temp_secrets[f"recovery_{user_email}"] = (secret, datetime.now() + timedelta(hours=1))
        return secret
        
    def verify_recovery_token(self, user_email: str, token: str) -> bool:
        """Verify a recovery token"""
        recovery_key = f"recovery_{user_email}"
        if recovery_key not in self._temp_secrets:
            return False
            
        secret, expiry = self._temp_secrets[recovery_key]
        if datetime.now() > expiry:
            del self._temp_secrets[recovery_key]
            return False
            
        return secret == token

import base64
import hashlib
import hmac
import json
import time
from typing import Dict, Optional, Tuple
from cryptography.fernet import Fernet
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class BiometricCredential:
    credential_id: str
    public_key: str
    sign_count: int
    user_id: str
    created_at: datetime
    last_used: datetime
    device_info: Dict[str, str]

class BiometricAuthenticator:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret_key.encode()).digest()))
        self._credentials: Dict[str, BiometricCredential] = {}
        
    def register_credential(
        self,
        user_id: str,
        credential_id: str,
        public_key: str,
        device_info: Dict[str, str]
    ) -> BiometricCredential:
        """Register a new biometric credential"""
        now = datetime.now()
        credential = BiometricCredential(
            credential_id=credential_id,
            public_key=public_key,
            sign_count=0,
            user_id=user_id,
            created_at=now,
            last_used=now,
            device_info=device_info
        )
        
        self._credentials[credential_id] = credential
        return credential
        
    def verify_credential(
        self,
        credential_id: str,
        client_data_json: str,
        authenticator_data: str,
        signature: str,
        user_id: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Verify a biometric credential"""
        credential = self._credentials.get(credential_id)
        
        if not credential:
            return False, "Credential not found"
            
        if user_id and credential.user_id != user_id:
            return False, "Credential does not belong to user"
            
        try:
            # Verify the signature
            client_data = json.loads(client_data_json)
            message = authenticator_data + hashlib.sha256(client_data_json.encode()).hexdigest()
            
            if not self._verify_signature(
                credential.public_key,
                message,
                signature
            ):
                return False, "Invalid signature"
                
            # Update sign count and last used
            credential.sign_count += 1
            credential.last_used = datetime.now()
            
            return True, "Verification successful"
            
        except Exception as e:
            return False, f"Verification failed: {str(e)}"
            
    def get_user_credentials(self, user_id: str) -> list[BiometricCredential]:
        """Get all credentials for a user"""
        return [
            cred for cred in self._credentials.values()
            if cred.user_id == user_id
        ]
        
    def remove_credential(self, credential_id: str, user_id: str) -> bool:
        """Remove a credential"""
        credential = self._credentials.get(credential_id)
        
        if not credential or credential.user_id != user_id:
            return False
            
        del self._credentials[credential_id]
        return True
        
    def cleanup_old_credentials(self, max_age_days: int = 180) -> int:
        """Remove credentials older than max_age_days"""
        now = datetime.now()
        max_age = timedelta(days=max_age_days)
        old_credentials = [
            cred_id for cred_id, cred in self._credentials.items()
            if now - cred.last_used > max_age
        ]
        
        for cred_id in old_credentials:
            del self._credentials[cred_id]
            
        return len(old_credentials)
        
    def _verify_signature(self, public_key: str, message: str, signature: str) -> bool:
        """Verify a cryptographic signature"""
        try:
            key = base64.b64decode(public_key)
            msg = base64.b64decode(message)
            sig = base64.b64decode(signature)
            
            return hmac.compare_digest(
                hmac.new(key, msg, hashlib.sha256).digest(),
                sig
            )
        except Exception:
            return False
            
    def encrypt_credential(self, credential: BiometricCredential) -> str:
        """Encrypt a credential for storage"""
        data = json.dumps({
            'credential_id': credential.credential_id,
            'public_key': credential.public_key,
            'sign_count': credential.sign_count,
            'user_id': credential.user_id,
            'created_at': credential.created_at.isoformat(),
            'last_used': credential.last_used.isoformat(),
            'device_info': credential.device_info
        })
        return self.fernet.encrypt(data.encode()).decode()
        
    def decrypt_credential(self, encrypted_data: str) -> BiometricCredential:
        """Decrypt a stored credential"""
        data = json.loads(self.fernet.decrypt(encrypted_data.encode()).decode())
        return BiometricCredential(
            credential_id=data['credential_id'],
            public_key=data['public_key'],
            sign_count=data['sign_count'],
            user_id=data['user_id'],
            created_at=datetime.fromisoformat(data['created_at']),
            last_used=datetime.fromisoformat(data['last_used']),
            device_info=data['device_info']
        )
        
class WebAuthnHelper:
    def __init__(self, rp_id: str, rp_name: str, origin: str):
        self.rp_id = rp_id
        self.rp_name = rp_name
        self.origin = origin
        
    def generate_registration_options(
        self,
        user_id: str,
        user_name: str,
        user_display_name: str
    ) -> Dict:
        """Generate WebAuthn registration options"""
        return {
            'challenge': base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8'),
            'rp': {
                'name': self.rp_name,
                'id': self.rp_id
            },
            'user': {
                'id': user_id,
                'name': user_name,
                'displayName': user_display_name
            },
            'pubKeyCredParams': [
                {'type': 'public-key', 'alg': -7},  # ES256
                {'type': 'public-key', 'alg': -257}  # RS256
            ],
            'timeout': 60000,
            'attestation': 'direct',
            'authenticatorSelection': {
                'authenticatorAttachment': 'platform',
                'requireResidentKey': False,
                'userVerification': 'preferred'
            }
        }
        
    def generate_authentication_options(
        self,
        user_credentials: list[BiometricCredential]
    ) -> Dict:
        """Generate WebAuthn authentication options"""
        return {
            'challenge': base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8'),
            'timeout': 60000,
            'rpId': self.rp_id,
            'allowCredentials': [
                {
                    'type': 'public-key',
                    'id': cred.credential_id,
                    'transports': ['internal']
                }
                for cred in user_credentials
            ],
            'userVerification': 'preferred'
        }
        
    def verify_registration_response(
        self,
        client_data_json: str,
        attestation_object: str,
        challenge: str
    ) -> Tuple[bool, Optional[Dict], str]:
        """Verify WebAuthn registration response"""
        try:
            client_data = json.loads(base64.urlsafe_b64decode(client_data_json))
            
            # Verify challenge
            if client_data['challenge'] != challenge:
                return False, None, "Challenge mismatch"
                
            # Verify origin
            if client_data['origin'] != self.origin:
                return False, None, "Origin mismatch"
                
            # Parse attestation object
            attestation = cbor2.loads(base64.urlsafe_b64decode(attestation_object))
            
            # Extract credential data
            auth_data = attestation['authData']
            credential_data = auth_data[37:]
            credential_id_length = int.from_bytes(credential_data[16:18], 'big')
            credential_id = credential_data[18:18+credential_id_length]
            
            return True, {
                'credential_id': base64.urlsafe_b64encode(credential_id).decode('utf-8'),
                'public_key': base64.urlsafe_b64encode(credential_data[18+credential_id_length:]).decode('utf-8')
            }, "Registration successful"
            
        except Exception as e:
            return False, None, f"Verification failed: {str(e)}"
            
    def verify_authentication_response(
        self,
        credential: BiometricCredential,
        client_data_json: str,
        authenticator_data: str,
        signature: str,
        challenge: str
    ) -> Tuple[bool, str]:
        """Verify WebAuthn authentication response"""
        try:
            client_data = json.loads(base64.urlsafe_b64decode(client_data_json))
            
            # Verify challenge
            if client_data['challenge'] != challenge:
                return False, "Challenge mismatch"
                
            # Verify origin
            if client_data['origin'] != self.origin:
                return False, "Origin mismatch"
                
            # Verify signature
            auth_data_bytes = base64.urlsafe_b64decode(authenticator_data)
            client_data_hash = hashlib.sha256(client_data_json.encode()).digest()
            
            message = auth_data_bytes + client_data_hash
            if not self._verify_signature(
                credential.public_key,
                base64.urlsafe_b64encode(message).decode(),
                signature
            ):
                return False, "Invalid signature"
                
            return True, "Authentication successful"
            
        except Exception as e:
            return False, f"Verification failed: {str(e)}"

import os
from datetime import datetime, timedelta
from typing import Union

from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-keep-it-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)
cipher_suite = Fernet(ENCRYPTION_KEY.encode())


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def generate_temporary_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    import secrets
    import string

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = "".join(secrets.choice(alphabet) for _ in range(length))
    return password


def generate_password_reset_token(length: int = 32) -> str:
    """Generate a secure password reset token"""
    import secrets

    return secrets.token_urlsafe(length)


# Encryption for PII
def encrypt_data(data: str) -> str:
    if not data:
        return None
    return cipher_suite.encrypt(data.encode()).decode()


def decrypt_data(token: str) -> str:
    if not token:
        return None
    return cipher_suite.decrypt(token.encode()).decode()

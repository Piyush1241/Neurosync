import logging
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.config import settings

logger = logging.getLogger("security")

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        logger.warning(f"Token decode failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"Token decode error: {e}")
        return None

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, hash_val = hashed.split(":")
        expected = hashlib.sha256(f"{salt}{plain}".encode()).hexdigest()
        return hmac.compare_digest(expected, hash_val)
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        logger.warning(f"Token decode failed: {e}")
        return None

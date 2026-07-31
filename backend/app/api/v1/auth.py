import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

logger = logging.getLogger("auth")

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(
    req: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(
        User.email == req.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        email=req.email,
        password_hash=hash_password(req.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"User registered: {req.email}")

    return {
        "message": "Registered successfully",
        "user_id": user.user_id
    }


@router.post("/login")
async def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == req.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    if not verify_password(
        req.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "sub": user.user_id,
        "email": user.email
    })

    logger.info(f"User logged in: {req.email}")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.user_id
    }



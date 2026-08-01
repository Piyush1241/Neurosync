import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

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
    email_clean = req.email.lower().strip()
    existing = db.query(User).filter(
        func.lower(User.email) == email_clean
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        email=email_clean,
        password_hash=hash_password(req.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"User registered: {email_clean}")

    return {
        "message": "Registered successfully",
        "user_id": user.user_id
    }


@router.post("/login")
async def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(
        func.lower(User.email) == email_clean
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


@router.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return {
        "total": len(users),
        "users": [
            {
                "user_id": u.user_id,
                "email": u.email,
                "password_hash": u.password_hash,
                "created_at": str(u.created_at) if u.created_at else None
            }
            for u in users
        ]
    }


@router.delete("/users")
async def delete_all_users(db: Session = Depends(get_db)):
    deleted_count = db.query(User).delete()
    db.commit()
    logger.info(f"Deleted {deleted_count} users from database")
    return {
        "message": f"Successfully deleted all {deleted_count} users",
        "deleted_count": deleted_count
    }




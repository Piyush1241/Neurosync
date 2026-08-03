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


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    id_token: str = None
    google_id: str = None
    name: str = None


@router.post("/register")
async def register(
    req: RegisterRequest,
    db: Session = Depends(get_db)
):
    import uuid
    email_clean = req.email.lower().strip()
    existing = db.query(User).filter(
        func.lower(User.email) == email_clean
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Use a deterministic namespace-based UUID so IDs are permanent & stable
    permanent_user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"user:{email_clean}"))

    user = User(
        user_id=permanent_user_id,
        email=email_clean,
        password_hash=hash_password(req.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"User registered permanently: {email_clean} (id: {user.user_id})")

    token = create_access_token({
        "sub": user.user_id,
        "email": user.email
    })

    return {
        "message": "Registered successfully",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "email": user.email
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
        "user_id": user.user_id,
        "email": user.email
    }


@router.post("/auth/google")
@router.post("/login/google")
async def google_auth(
    req: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    import uuid
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(
        func.lower(User.email) == email_clean
    ).first()

    is_new = False
    if not user:
        is_new = True
        permanent_user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"user:{email_clean}"))
        user = User(
            user_id=permanent_user_id,
            email=email_clean,
            password_hash=hash_password(f"google_oauth_{uuid.uuid4().hex}")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"New user registered via Google OAuth: {email_clean} (id: {user.user_id})")
    else:
        logger.info(f"Existing user logged in via Google OAuth: {email_clean} (id: {user.user_id})")

    token = create_access_token({
        "sub": user.user_id,
        "email": user.email
    })

    return {
        "message": "Google authentication successful",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "email": user.email,
        "is_new_user": is_new
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
                "created_at": str(u.created_at) if u.created_at else None
            }
            for u in users
        ]
    }




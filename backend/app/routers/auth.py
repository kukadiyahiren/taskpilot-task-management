from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import PasswordResetToken, User
from app.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRead,
    UserRegister,
)
from app.security import (
    create_access_token,
    generate_password_reset_token,
    hash_password,
    hash_password_reset_token,
    verify_password,
)
from app.services.user_read import public_user_read

router = APIRouter(prefix="/auth", tags=["auth"])

_PASSWORD_RESET_TTL = timedelta(hours=1)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email.lower().strip(),
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        role="staff",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, token_type="bearer", user=public_user_read(user))


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, token_type="bearer", user=public_user_read(user))


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return public_user_read(user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    reset_token: str | None = None
    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).delete(synchronize_session=False)
        plain = generate_password_reset_token()
        row = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_password_reset_token(plain),
            expires_at=datetime.now(timezone.utc) + _PASSWORD_RESET_TTL,
        )
        db.add(row)
        db.commit()
        if settings.password_reset_return_token:
            reset_token = plain
    return ForgotPasswordResponse(
        message="If an account exists for that email, follow the instructions to set a new password.",
        reset_token=reset_token,
    )


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_password_reset_token(body.token.strip())
    now = datetime.now(timezone.utc)
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Request a new one.",
        )
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Request a new one.",
        )
    user.password_hash = hash_password(body.new_password)
    row.used_at = now
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

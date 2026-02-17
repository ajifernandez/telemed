import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    MedicalProfessionalRegister,
    PasswordChange,
    PasswordReset,
    PasswordResetConfirm,
    TemporaryPasswordLogin,
)
from app.schemas.user import User as UserSchema
from app.schemas.user import (
    UserLogin,
    UserLoginResponse,
)
from app.services.email import get_email_service

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ACCESS_TOKEN_EXPIRE_MINUTES = 30
TEMPORARY_PASSWORD_LENGTH = 12
RESET_TOKEN_EXPIRE_HOURS = 1


def generate_temporary_password(length=12):
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = "".join(secrets.choice(alphabet) for _ in range(length))
    return password


def generate_reset_token():
    """Generate a secure reset token"""
    return secrets.token_urlsafe(32)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    from jose import JWTError, jwt

    from app.core.security import ALGORITHM, SECRET_KEY

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


@router.post("/login", response_model=UserLoginResponse)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = db.query(User).filter(User.email == user_credentials.email).first()

    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Determine dashboard URL based on user role
    dashboard_url = "/"  # default fallback to landing page

    if user.is_superuser:
        dashboard_url = "/it/medical-professionals"
    elif getattr(user, "role", None) in ["medical_admin", "admin"]:
        dashboard_url = "/admin"
    elif getattr(user, "role", None) in ["specialist"] or getattr(user, "is_medical_professional", False):
        dashboard_url = "/doctor"
    elif getattr(user, "role", None) in ["it_admin"]:
        dashboard_url = "/it/medical-professionals"

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "requires_password_change": user.is_first_login,
        "dashboard_url": dashboard_url,
    }


@router.post("/login-temporary", response_model=UserLoginResponse)
def login_with_temporary_password(
    credentials: TemporaryPasswordLogin, db: Session = Depends(get_db)
):
    """Login with temporary password (first login)"""
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Email not found"
        )

    # Check temporary password
    if not user.temporary_password or not user.temporary_password_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No temporary password set"
        )

    if datetime.utcnow() > user.temporary_password_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Temporary password expired"
        )

    if not verify_password(credentials.temporary_password, user.temporary_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid temporary password",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "requires_password_change": True,
    }


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password (for first login or regular password change)"""
    # Verify current password (unless it's first login with temporary password)
    if not current_user.is_first_login:
        if not verify_password(
            password_data.current_password, current_user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

    # Hash new password
    new_hashed_password = get_password_hash(password_data.new_password)

    # Update user
    current_user.hashed_password = new_hashed_password
    current_user.is_first_login = False
    current_user.temporary_password = None
    current_user.temporary_password_expires = None
    current_user.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/reset-password")
def reset_password(request: PasswordReset, db: Session = Depends(get_db)):
    """Request password reset"""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Don't reveal that email doesn't exist
        return {"message": "If email exists, reset instructions have been sent"}

    # Generate reset token
    reset_token = generate_reset_token()
    expires = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)

    user.password_reset_token = reset_token
    user.password_reset_expires = expires
    user.updated_at = datetime.utcnow()

    db.commit()

    # Send email with reset link
    email_service = get_email_service()
    if hasattr(email_service, "send_password_reset_email"):
        email_service.send_password_reset_email(user.email, user.full_name, reset_token)
    else:
        # Development mode - log the reset token
        print(f"Password reset token for {user.email}: {reset_token}")

    return {"message": "Password reset instructions sent"}


@router.post("/reset-password-confirm")
def reset_password_confirm(
    reset_data: PasswordResetConfirm, db: Session = Depends(get_db)
):
    """Confirm password reset with token"""
    user = db.query(User).filter(User.password_reset_token == reset_data.token).first()

    if not user or not user.password_reset_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token"
        )

    if datetime.utcnow() > user.password_reset_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token expired"
        )

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.is_first_login = False  # Reset first login flag
    user.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Password reset successfully"}


@router.post("/register-medical-professional")
def register_medical_professional(
    registration_data: MedicalProfessionalRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new medical professional (private registration)"""
    if not current_user.is_superuser and getattr(current_user, "role", None) != "it_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    # TODO: Validate registration_token

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == registration_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Check if license number already exists
    existing_license = (
        db.query(User)
        .filter(User.license_number == registration_data.license_number)
        .first()
    )
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License number already registered",
        )

    # Generate temporary password
    temp_password = generate_temporary_password()
    temp_password_hash = get_password_hash(temp_password)
    temp_password_expires = datetime.utcnow() + timedelta(hours=24)

    # Create user
    user = User(
        email=registration_data.email,
        full_name=registration_data.full_name,
        license_number=registration_data.license_number,
        specialty=registration_data.specialty,
        is_medical_professional=True,
        hashed_password=temp_password_hash,  # Will be replaced on first login
        temporary_password=temp_password_hash,
        temporary_password_expires=temp_password_expires,
        is_first_login=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Send email with temporary password
    email_service = get_email_service()
    if hasattr(email_service, "send_temporary_password_email"):
        email_service.send_temporary_password_email(
            user.email, user.full_name, temp_password
        )
    else:
        # Development mode - print the temporary password
        print(f"Temporary password for {user.email}: {temp_password}")

    # TODO: Send welcome email after password change
    return {
        "message": "Medical professional registered successfully",
        "user_id": user.id,
    }


@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

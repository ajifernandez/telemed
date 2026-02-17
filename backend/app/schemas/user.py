from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_medical_professional: bool = False
    role: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    is_first_login: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User
    requires_password_change: bool
    dashboard_url: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class TemporaryPasswordLogin(BaseModel):
    email: EmailStr
    temporary_password: str


class MedicalProfessionalRegister(BaseModel):
    email: EmailStr
    full_name: str
    license_number: str
    specialty: str
    registration_token: str  # Token para validar el registro privado

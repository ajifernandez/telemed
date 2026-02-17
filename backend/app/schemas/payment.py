from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal


class PaymentBase(BaseModel):
    amount: Decimal
    currency: str = "EUR"
    status: str


class PaymentCreate(PaymentBase):
    consultation_id: int


class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    completed_at: Optional[datetime] = None


class Payment(PaymentBase):
    id: int
    consultation_id: int
    stripe_payment_intent_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    refund_amount: Optional[Decimal] = None
    stripe_refund_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentWithPatient(Payment):
    consultation: Optional['ConsultationWithPatient'] = None


class ConsultationWithPatient(BaseModel):
    id: int
    patient: Optional['PatientBasic'] = None


class PatientBasic(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True


# Update forward references
PaymentWithPatient.model_rebuild()
ConsultationWithPatient.model_rebuild()
PatientBasic.model_rebuild()

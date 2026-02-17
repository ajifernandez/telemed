from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class ConsultationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class ConsultationType(str, Enum):
    VIDEO = "video"
    PHONE = "phone"
    IN_PERSON = "in_person"


# Consultation Schemas
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

class ConsultationBase(BaseModel):
    consultation_type: ConsultationType = ConsultationType.VIDEO
    specialty: str
    reason_for_visit: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 30


class ConsultationCreate(ConsultationBase):
    patient_id: int
    doctor_id: int


class ConsultationUpdate(BaseModel):
    status: Optional[ConsultationStatus] = None
    notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class Consultation(ConsultationBase):
    id: int
    patient_id: int
    doctor_id: int
    status: ConsultationStatus
    jitsi_room_name: Optional[str] = None
    jitsi_room_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicDoctor(BaseModel):
    id: int
    full_name: str
    specialty: Optional[str] = None


# Payment Schemas
class PaymentBase(BaseModel):
    amount: Decimal
    currency: str = "EUR"


class PaymentCreate(PaymentBase):
    consultation_id: int


class Payment(PaymentBase):
    id: int
    consultation_id: int
    status: PaymentStatus
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


# Stripe Checkout Session
class CheckoutSessionCreate(BaseModel):
    consultation_id: int
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str


# Webhook Events
class WebhookEvent(BaseModel):
    type: str
    data: dict


# Patient Schemas
class PatientBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class Patient(PatientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Doctor Schemas
class DoctorBase(BaseModel):
    full_name: str
    specialty: str
    license_number: str


class Doctor(DoctorBase):
    id: int
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True


# Booking Flow Schemas
class BookingRequest(BaseModel):
    doctor_id: int
    patient_data: PatientCreate
    consultation_data: ConsultationCreate
    payment_data: PaymentCreate


class BookingResponse(BaseModel):
    consultation: Consultation
    payment: Payment
    checkout_session: CheckoutSessionResponse


# Availability Schemas
class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime
    is_available: bool = True


class DoctorAvailability(BaseModel):
    doctor_id: int
    date: str  # YYYY-MM-DD
    available_slots: List[TimeSlot]


# Consultation with Payment
class ConsultationWithPayment(Consultation):
    payment: Optional[Payment] = None
    patient: Optional[Patient] = None
    doctor: Optional[Doctor] = None


class ConsultationWithPatient(Consultation):
    patient: Patient


class PublicBookingCreate(BaseModel):
    doctor_id: int
    patient: PatientCreate
    specialty: str
    reason_for_visit: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 30


class StaffConsultationCreate(BaseModel):
    patient_id: Optional[int] = None
    patient: Optional[PatientCreate] = None
    doctor_id: Optional[int] = None
    consultation_type: ConsultationType = ConsultationType.VIDEO
    specialty: str
    reason_for_visit: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 30


class PublicBookingResponse(BaseModel):
    consultation: Consultation
    jitsi_room_url: Optional[str] = None

from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


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


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Consultation details
    consultation_type = Column(String, default="video")  # video, phone, in-person
    specialty = Column(String, nullable=False)
    reason_for_visit = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Scheduling
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=30)
    status = Column(String, default=ConsultationStatus.PENDING)

    # Video consultation
    jitsi_room_name = Column(String, nullable=True)
    jitsi_room_url = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("User", back_populates="consultations")
    payment = relationship("Payment", back_populates="consultation", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)

    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="EUR")
    status = Column(String, default=PaymentStatus.PENDING)

    # Stripe integration
    stripe_payment_intent_id = Column(String, nullable=True, unique=True)
    stripe_session_id = Column(String, nullable=True, unique=True)
    stripe_customer_id = Column(String, nullable=True)

    # Refund
    refund_amount = Column(Numeric(10, 2), nullable=True)
    stripe_refund_id = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    consultation = relationship("Consultation", back_populates="payment")

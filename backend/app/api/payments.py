import os
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.consultation import (
    Consultation,
    ConsultationStatus,
    Payment,
    PaymentStatus,
)
from app.models.user import User
from app.schemas.consultation import (
    CheckoutSessionCreate,
    CheckoutSessionResponse,
)
from app.schemas.consultation import Consultation as ConsultationSchema
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationUpdate,
    ConsultationWithPayment,
)
from app.schemas.payment import PaymentWithPatient
from app.services.email import get_email_service

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(
    checkout_data: CheckoutSessionCreate, db: Session = Depends(get_db)
):
    """Create Stripe Checkout Session for consultation payment"""

    # Get consultation
    consultation = (
        db.query(Consultation)
        .filter(Consultation.id == checkout_data.consultation_id)
        .first()
    )
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )

    # Create or get payment record
    payment = (
        db.query(Payment).filter(Payment.consultation_id == consultation.id).first()
    )
    if not payment:
        payment = Payment(
            consultation_id=consultation.id,
            amount=50.00,  # Default consultation fee
            currency="EUR",
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

    try:
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {
                            "name": f"Videoconsulta - {consultation.specialty}",
                            "description": (
                                f"Consulta con {consultation.doctor.full_name}"
                            ),
                        },
                        "unit_amount": int(
                            float(payment.amount) * 100
                        ),  # Convert to cents
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=checkout_data.success_url,
            cancel_url=checkout_data.cancel_url,
            customer_email=consultation.patient.email if consultation.patient else None,
            metadata={
                "consultation_id": str(consultation.id),
                "payment_id": str(payment.id),
            },
        )

        # Update payment with Stripe session ID
        payment.stripe_session_id = session.id
        db.commit()

        return CheckoutSessionResponse(session_id=session.id, checkout_url=session.url)

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Stripe error: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks for payment events"""

    body = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No signature provided"
        )

    try:
        event = stripe.Webhook.construct_event(body, signature, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature"
        )

    # Handle the event
    if event["type"] == "checkout.session.completed":
        await handle_checkout_session_completed(event["data"]["object"], db)
    elif event["type"] == "payment_intent.succeeded":
        await handle_payment_intent_succeeded(event["data"]["object"], db)
    elif event["type"] == "payment_intent.payment_failed":
        await handle_payment_intent_failed(event["data"]["object"], db)

    return {"status": "success"}


async def handle_checkout_session_completed(session: dict, db: Session):
    """Handle successful checkout session"""

    consultation_id = int(session["metadata"]["consultation_id"])
    payment_id = int(session["metadata"]["payment_id"])

    # Update payment record
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if payment:
        payment.status = PaymentStatus.COMPLETED
        payment.stripe_payment_intent_id = session.get("payment_intent")
        payment.stripe_customer_id = session.get("customer")
        payment.completed_at = datetime.utcnow()
        db.commit()

    # Update consultation status
    consultation = (
        db.query(Consultation).filter(Consultation.id == consultation_id).first()
    )
    if consultation:
        consultation.status = ConsultationStatus.CONFIRMED
        db.commit()

        # Send confirmation emails
        email_service = get_email_service()
        if hasattr(email_service, "send_consultation_confirmation"):
            # Send to patient
            email_service.send_consultation_confirmation(
                consultation.patient.email, consultation.patient.full_name, consultation
            )
            # Send to doctor
            email_service.send_doctor_notification(
                consultation.doctor.email, consultation.doctor.full_name, consultation
            )


async def handle_payment_intent_succeeded(payment_intent: dict, db: Session):
    """Handle successful payment intent"""
    # This is a backup handler if checkout.session.completed doesn't fire
    pass


async def handle_payment_intent_failed(payment_intent: dict, db: Session):
    """Handle failed payment"""
    # Find payment by stripe_payment_intent_id
    payment = (
        db.query(Payment)
        .filter(Payment.stripe_payment_intent_id == payment_intent["id"])
        .first()
    )

    if payment:
        payment.status = PaymentStatus.FAILED
        db.commit()

        # Update consultation status
        consultation = payment.consultation
        consultation.status = ConsultationStatus.CANCELLED
        db.commit()


@router.get("/doctor/payments", response_model=list[PaymentWithPatient])
def get_doctor_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Get payments for current doctor"""

    # Only medical professionals can access their payments
    if not current_user.is_medical_professional:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view payments"
        )

    # Get payments for consultations assigned to this doctor with patient info
    payments = (
        db.query(Payment)
        .join(Consultation, Payment.consultation_id == Consultation.id)
        .filter(Consultation.doctor_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return payments


@router.get("/consultations", response_model=list[ConsultationWithPayment])
def get_consultations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Get consultations for current user"""

    if current_user.is_medical_professional:
        # Doctors see their consultations
        consultations = (
            db.query(Consultation)
            .filter(Consultation.doctor_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        # Patients see their consultations (if we implement patient auth)
        consultations = db.query(Consultation).offset(skip).limit(limit).all()

    return consultations


@router.post("/consultations", response_model=ConsultationSchema)
def create_consultation(
    consultation_data: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new consultation"""

    # Verify doctor exists and is medical professional
    doctor = (
        db.query(User)
        .filter(User.id == consultation_data.doctor_id, User.is_medical_professional)
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
        )

    # Create consultation
    consultation = Consultation(**consultation_data.dict())
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return consultation


@router.put("/consultations/{consultation_id}", response_model=ConsultationSchema)
def update_consultation(
    consultation_id: int,
    consultation_update: ConsultationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update consultation status"""

    consultation = (
        db.query(Consultation).filter(Consultation.id == consultation_id).first()
    )
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )

    # Check permissions
    if (
        current_user.is_medical_professional
        and consultation.doctor_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this consultation",
        )

    # Update consultation
    update_data = consultation_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(consultation, field, value)

    consultation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(consultation)

    return consultation

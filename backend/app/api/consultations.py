import os
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.consultation import Consultation, ConsultationStatus
from app.models.user import Patient, User
from app.schemas.consultation import (
    ConsultationWithPatient,
    ConsultationType,
    PublicDoctor,
    PublicBookingCreate,
    PublicBookingResponse,
    StaffConsultationCreate,
)
from app.services.email import get_email_service

router = APIRouter()


@router.get("/public/doctors", response_model=list[PublicDoctor])
def list_public_doctors(db: Session = Depends(get_db)):
    doctors = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .filter(User.is_medical_professional.is_(True))
        .order_by(User.full_name.asc())
        .all()
    )

    return [
        {
            "id": d.id,
            "full_name": d.full_name,
            "specialty": d.specialty,
        }
        for d in doctors
    ]


def _generate_jitsi_room(consultation_id: int) -> tuple[str, str]:
    room_name = f"Telemed_{consultation_id}_{secrets.token_hex(4)}"
    jitsi_domain = os.getenv("JITSI_DOMAIN", "meet.jit.si")
    jitsi_room_url = f"https://{jitsi_domain}/{room_name}"
    return room_name, jitsi_room_url


@router.post("/public/book", response_model=PublicBookingResponse)
def public_book_consultation(payload: PublicBookingCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.email == payload.patient.email).first()
    if not patient:
        patient = Patient(
            full_name=payload.patient.full_name,
            email=payload.patient.email,
            phone=payload.patient.phone,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    doctor = db.query(User).filter(User.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found"
        )

    consultation = Consultation(
        patient_id=patient.id,
        doctor_id=doctor.id,
        consultation_type=ConsultationType.VIDEO.value,
        specialty=payload.specialty,
        reason_for_visit=payload.reason_for_visit,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        status=ConsultationStatus.CONFIRMED,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    room_name, room_url = _generate_jitsi_room(consultation.id)
    consultation.jitsi_room_name = room_name
    consultation.jitsi_room_url = room_url
    consultation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(consultation)

    email_service = get_email_service()
    if hasattr(email_service, "send_consultation_confirmation"):
        email_service.send_consultation_confirmation(
            patient.email, patient.full_name, consultation
        )
    else:
        print(f"Consultation confirmation email to {patient.email}: {room_url}")

    if hasattr(email_service, "send_doctor_notification"):
        email_service.send_doctor_notification(doctor.email, doctor.full_name, consultation)

    return {
        "consultation": consultation,
        "jitsi_room_url": consultation.jitsi_room_url,
    }


@router.post("", response_model=PublicBookingResponse)
def create_consultation_staff(
    payload: StaffConsultationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = getattr(current_user, "role", None)
    allowed_roles = {"specialist", "medical_admin", "it_admin", "administration", "reception"}
    if not current_user.is_superuser and role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    patient = None
    if payload.patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()

    if not patient and payload.patient is not None:
        patient = db.query(Patient).filter(Patient.email == payload.patient.email).first()
        if not patient:
            patient = Patient(
                full_name=payload.patient.full_name,
                email=payload.patient.email,
                phone=payload.patient.phone,
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient not provided",
        )

    doctor_id = payload.doctor_id
    if role == "specialist":
        doctor_id = current_user.id

    if not doctor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not provided")

    doctor = db.query(User).filter(User.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found")

    consultation = Consultation(
        patient_id=patient.id,
        doctor_id=doctor.id,
        consultation_type=payload.consultation_type.value,
        specialty=payload.specialty,
        reason_for_visit=payload.reason_for_visit,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        status=ConsultationStatus.CONFIRMED,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    if payload.consultation_type == ConsultationType.VIDEO:
        room_name, room_url = _generate_jitsi_room(consultation.id)
        consultation.jitsi_room_name = room_name
        consultation.jitsi_room_url = room_url
        consultation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(consultation)

    return {
        "consultation": consultation,
        "jitsi_room_url": consultation.jitsi_room_url,
    }


@router.get("/me", response_model=list[ConsultationWithPatient])
def list_my_consultations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = getattr(current_user, "role", None)
    allowed_roles = {"specialist", "medical_admin", "it_admin"}
    if not current_user.is_superuser and role not in allowed_roles and not current_user.is_medical_professional:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    return (
        db.query(Consultation)
        .options(joinedload(Consultation.patient))
        .filter(Consultation.doctor_id == current_user.id)
        .order_by(Consultation.scheduled_at.asc())
        .all()
    )

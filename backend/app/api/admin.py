from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.consultation import Consultation, ConsultationStatus
from app.models.user import Patient, User

router = APIRouter()


class MedicalProfessionalUpdate(BaseModel):
    is_active: bool | None = None
    role: str | None = None
    specialty: str | None = None
    full_name: str | None = None


class MedicalProfessionalOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    role: str | None = None
    is_active: bool
    is_medical_professional: bool

    class Config:
        from_attributes = True


def _require_it_admin(current_user: User):
    if current_user.is_superuser:
        return
    if getattr(current_user, "role", None) != "it_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


def _require_admin_clinic(current_user: User):
    if current_user.is_superuser:
        return
    role = getattr(current_user, "role", None)
    allowed = {"medical_admin", "administration", "reception", "it_admin"}
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


@router.get("/medical-professionals", response_model=list[MedicalProfessionalOut])
def list_medical_professionals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_it_admin(current_user)

    return (
        db.query(User)
        .filter(User.is_medical_professional.is_(True))
        .order_by(User.full_name.asc())
        .all()
    )


@router.patch("/medical-professionals/{user_id}", response_model=MedicalProfessionalOut)
def update_medical_professional(
    user_id: int,
    payload: MedicalProfessionalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_it_admin(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_medical_professional:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)
    return user


class PatientOut(BaseModel):
    id: int
    full_name: str | None = None
    email: str
    phone: str | None = None

    class Config:
        from_attributes = True


@router.get("/patients", response_model=list[PatientOut])
def list_patients(
    q: str | None = None,
    limit: int = 200,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin_clinic(current_user)

    query = db.query(Patient)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter((Patient.email.ilike(term)) | (Patient.full_name.ilike(term)))
    query = query.order_by(Patient.created_at.desc())
    if limit and limit > 0:
        query = query.limit(min(limit, 500))
    return query.all()


class AdminDoctorOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    specialty: str | None = None

    class Config:
        from_attributes = True


class AdminConsultationOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    consultation_type: str
    specialty: str
    reason_for_visit: str | None = None
    scheduled_at: str
    duration_minutes: int
    status: str
    jitsi_room_url: str | None = None
    patient: PatientOut
    doctor: AdminDoctorOut


@router.get("/consultations", response_model=list[AdminConsultationOut])
def list_consultations(
    day: str | None = None,
    doctor_id: int | None = None,
    patient_id: int | None = None,
    status_filter: str | None = None,
    limit: int = 500,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin_clinic(current_user)

    query = (
        db.query(Consultation)
        .options(joinedload(Consultation.patient), joinedload(Consultation.doctor))
    )

    if day:
        from datetime import datetime, timedelta

        try:
            start = datetime.strptime(day, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid day")
        end = start + timedelta(days=1)
        query = query.filter(Consultation.scheduled_at >= start).filter(Consultation.scheduled_at < end)

    if doctor_id is not None:
        query = query.filter(Consultation.doctor_id == doctor_id)
    if patient_id is not None:
        query = query.filter(Consultation.patient_id == patient_id)

    if status_filter:
        query = query.filter(Consultation.status == status_filter)

    query = query.order_by(Consultation.scheduled_at.asc())
    if limit and limit > 0:
        query = query.limit(min(limit, 1000))

    rows = query.all()

    def _iso(dt):
        try:
            return dt.isoformat()
        except Exception:
            return str(dt)

    out: list[AdminConsultationOut] = []
    for c in rows:
        out.append(
            {
                "id": c.id,
                "patient_id": c.patient_id,
                "doctor_id": c.doctor_id,
                "consultation_type": c.consultation_type,
                "specialty": c.specialty,
                "reason_for_visit": c.reason_for_visit,
                "scheduled_at": _iso(c.scheduled_at),
                "duration_minutes": c.duration_minutes,
                "status": c.status,
                "jitsi_room_url": c.jitsi_room_url,
                "patient": c.patient,
                "doctor": c.doctor,
            }
        )
    return out


class ConsultationUpdate(BaseModel):
    doctor_id: int | None = None
    scheduled_at: str | None = None
    duration_minutes: int | None = None
    status: str | None = None
    notes: str | None = None


@router.patch("/consultations/{consultation_id}", response_model=AdminConsultationOut)
def update_consultation(
    consultation_id: int,
    payload: ConsultationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin_clinic(current_user)

    consultation = (
        db.query(Consultation)
        .options(joinedload(Consultation.patient), joinedload(Consultation.doctor))
        .filter(Consultation.id == consultation_id)
        .first()
    )
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    data = payload.model_dump(exclude_unset=True)

    if "scheduled_at" in data and data["scheduled_at"]:
        from datetime import datetime

        try:
            data["scheduled_at"] = datetime.fromisoformat(data["scheduled_at"])
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid scheduled_at")

    if "status" in data and data["status"] is not None:
        allowed_status = {s.value for s in ConsultationStatus}
        if data["status"] not in allowed_status:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    if "doctor_id" in data and data["doctor_id"] is not None:
        doctor = db.query(User).filter(User.id == data["doctor_id"]).first()
        if not doctor or not doctor.is_medical_professional:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found")

    for k, v in data.items():
        setattr(consultation, k, v)

    db.commit()
    db.refresh(consultation)

    def _iso(dt):
        try:
            return dt.isoformat()
        except Exception:
            return str(dt)

    return {
        "id": consultation.id,
        "patient_id": consultation.patient_id,
        "doctor_id": consultation.doctor_id,
        "consultation_type": consultation.consultation_type,
        "specialty": consultation.specialty,
        "reason_for_visit": consultation.reason_for_visit,
        "scheduled_at": _iso(consultation.scheduled_at),
        "duration_minutes": consultation.duration_minutes,
        "status": consultation.status,
        "jitsi_room_url": consultation.jitsi_room_url,
        "patient": consultation.patient,
        "doctor": consultation.doctor,
    }

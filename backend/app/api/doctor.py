from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.history import ClinicalRecord as ClinicalRecordModel
from app.models.user import Patient, User
from app.models.consultation import Consultation
from app.schemas.history import ClinicalRecord as ClinicalRecordSchema, ClinicalRecordCreate, ClinicalRecordUpdate
from app.schemas.doctor import DoctorPatient
from app.schemas.doctor_consultations import ConsultationWithPatient

router = APIRouter()


def _require_medical_user(current_user: User):
    role = getattr(current_user, "role", None)
    allowed_roles = {"specialist", "medical_admin", "it_admin"}
    if not current_user.is_superuser and role not in allowed_roles and not current_user.is_medical_professional:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


@router.get("/patients", response_model=list[DoctorPatient])
def list_patients_for_doctor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)

    patients = db.query(Patient).order_by(Patient.full_name.asc()).all()

    result: list[DoctorPatient] = []
    for p in patients:
        latest = (
            db.query(ClinicalRecordModel)
            .filter(ClinicalRecordModel.patient_id == p.id)
            .order_by(ClinicalRecordModel.created_at.desc())
            .first()
        )
        records_count = db.query(ClinicalRecordModel).filter(ClinicalRecordModel.patient_id == p.id).count()
        latest_date = (
            db.query(ClinicalRecordModel)
            .filter(ClinicalRecordModel.patient_id == p.id)
            .order_by(ClinicalRecordModel.created_at.desc())
            .first()
        )
        result.append(
            DoctorPatient(
                id=p.id,
                full_name=p.full_name,
                email=p.email,
                phone=p.phone,
                created_at=p.created_at,
                latest_record=latest,
                records_count=records_count,
                latest_record_date=latest_date.created_at if latest_date else None,
            )
        )

    return result


@router.get("/patients/{patient_id}/history", response_model=list[ClinicalRecordSchema])
def get_patient_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    return (
        db.query(ClinicalRecordModel)
        .filter(ClinicalRecordModel.patient_id == patient_id)
        .order_by(ClinicalRecordModel.created_at.desc())
        .all()
    )


@router.post("/patients/{patient_id}/history", response_model=ClinicalRecordSchema)
def create_patient_record(
    patient_id: int,
    payload: ClinicalRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    record = ClinicalRecordModel(
        patient_id=patient_id,
        chief_complaint=payload.chief_complaint,
        background=payload.background,
        assessment=payload.assessment,
        plan=payload.plan,
        allergies=payload.allergies,
        medications=payload.medications,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/patients/{patient_id}/history/{record_id}", response_model=ClinicalRecordSchema)
def update_patient_record(
    patient_id: int,
    record_id: int,
    payload: ClinicalRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)

    record = (
        db.query(ClinicalRecordModel)
        .filter(ClinicalRecordModel.id == record_id, ClinicalRecordModel.patient_id == patient_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record


@router.get("/consultations", response_model=list[ConsultationWithPatient])
def get_doctor_consultations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)

    # Get consultations assigned to this doctor with patient info
    consultations = (
        db.query(Consultation)
        .filter(Consultation.doctor_id == current_user.id)
        .order_by(Consultation.scheduled_at.desc())
        .all()
    )

    return consultations


@router.delete("/patients/{patient_id}/history/{record_id}")
def delete_patient_record(
    patient_id: int,
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)

    record = (
        db.query(ClinicalRecordModel)
        .filter(ClinicalRecordModel.id == record_id, ClinicalRecordModel.patient_id == patient_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    db.delete(record)
    db.commit()
    return {"detail": "Record deleted"}

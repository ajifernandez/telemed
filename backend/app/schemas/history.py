from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ClinicalRecord(BaseModel):
    id: int
    patient_id: int

    chief_complaint: Optional[str] = None
    background: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True


class ClinicalRecordCreate(BaseModel):
    chief_complaint: Optional[str] = None
    background: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None


class ClinicalRecordUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    background: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ConsultationBase(BaseModel):
    consultation_type: str = "video"
    specialty: str
    reason_for_visit: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 30
    status: str = "pending"


class ConsultationWithPatient(ConsultationBase):
    id: int
    patient_id: int
    doctor_id: int
    notes: Optional[str] = None
    jitsi_room_name: Optional[str] = None
    jitsi_room_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    patient: Optional['PatientBasic'] = None

    class Config:
        from_attributes = True


class PatientBasic(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


# Update forward references
ConsultationWithPatient.model_rebuild()
PatientBasic.model_rebuild()

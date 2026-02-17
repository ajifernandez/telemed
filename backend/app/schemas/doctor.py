from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.schemas.history import ClinicalRecord


class DoctorPatient(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    created_at: datetime
    latest_record: Optional[ClinicalRecord] = None
    records_count: int = 0
    latest_record_date: Optional[datetime] = None

    class Config:
        from_attributes = True

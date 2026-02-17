from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ClinicalTemplate(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    chief_complaint: Optional[str] = None
    background: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    created_at: datetime
    created_by_id: Optional[int] = None

    class Config:
        from_attributes = True


class ClinicalTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    chief_complaint: Optional[str] = None
    background: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None


class ClinicalTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    chief_complaint: Optional[str] = None
    background: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None

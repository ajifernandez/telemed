from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.template import ClinicalTemplate as ClinicalTemplateModel
from app.models.user import User
from app.schemas.template import (
    ClinicalTemplate as ClinicalTemplateSchema,
    ClinicalTemplateCreate,
    ClinicalTemplateUpdate,
)

router = APIRouter()


def _require_medical_user(current_user: User):
    role = getattr(current_user, "role", None)
    allowed_roles = {"specialist", "medical_admin", "it_admin"}
    if not current_user.is_superuser and role not in allowed_roles and not current_user.is_medical_professional:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


@router.get("/", response_model=list[ClinicalTemplateSchema])
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    return db.query(ClinicalTemplateModel).order_by(ClinicalTemplateModel.name.asc()).all()


@router.post("/", response_model=ClinicalTemplateSchema)
def create_template(
    payload: ClinicalTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    template = ClinicalTemplateModel(
        name=payload.name,
        description=payload.description,
        chief_complaint=payload.chief_complaint,
        background=payload.background,
        assessment=payload.assessment,
        plan=payload.plan,
        allergies=payload.allergies,
        medications=payload.medications,
        created_at=datetime.utcnow(),
        created_by_id=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=ClinicalTemplateSchema)
def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    template = db.query(ClinicalTemplateModel).filter(ClinicalTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=ClinicalTemplateSchema)
def update_template(
    template_id: int,
    payload: ClinicalTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    template = db.query(ClinicalTemplateModel).filter(ClinicalTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    template = db.query(ClinicalTemplateModel).filter(ClinicalTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"detail": "Template deleted"}

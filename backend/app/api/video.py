import os
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.consultation import Consultation
from app.models.user import User

router = APIRouter()


@router.post("/consultations/{consultation_id}/start-video")
def start_video_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start video consultation and generate Jitsi room"""

    consultation = (
        db.query(Consultation).filter(Consultation.id == consultation_id).first()
    )
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )

    # Check permissions
    if consultation.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start this consultation",
        )

    # Check if consultation is confirmed
    if consultation.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation must be confirmed before starting",
        )

    # Generate Jitsi room details
    room_name = f"Telemed_{consultation.id}_{secrets.token_hex(4)}"
    jitsi_domain = os.getenv("JITSI_DOMAIN", "meet.jit.si")
    jitsi_room_url = f"https://{jitsi_domain}/{room_name}"

    # Update consultation
    consultation.jitsi_room_name = room_name
    consultation.jitsi_room_url = jitsi_room_url
    consultation.status = "in_progress"
    consultation.started_at = datetime.utcnow()
    db.commit()

    return {
        "room_name": room_name,
        "room_url": jitsi_room_url,
        "jitsi_domain": jitsi_domain,
    }


@router.post("/consultations/{consultation_id}/end-video")
def end_video_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """End video consultation"""

    consultation = (
        db.query(Consultation).filter(Consultation.id == consultation_id).first()
    )
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )

    # Check permissions
    if consultation.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to end this consultation",
        )

    # Update consultation
    consultation.status = "completed"
    consultation.ended_at = datetime.utcnow()
    db.commit()

    return {"message": "Consultation ended successfully"}


@router.get("/consultations/{consultation_id}/video-info")
def get_video_info(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get video consultation information"""

    consultation = (
        db.query(Consultation).filter(Consultation.id == consultation_id).first()
    )
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )

    # Check permissions (doctor or patient)
    if consultation.doctor_id != current_user.id and not hasattr(
        current_user, "patient_id"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this consultation",
        )

    if not consultation.jitsi_room_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video consultation not started",
        )

    jitsi_domain = os.getenv("JITSI_DOMAIN", "meet.jit.si")

    return {
        "room_name": consultation.jitsi_room_name,
        "room_url": consultation.jitsi_room_url,
        "jitsi_domain": jitsi_domain,
        "status": consultation.status,
        "scheduled_at": consultation.scheduled_at,
        "started_at": consultation.started_at,
    }

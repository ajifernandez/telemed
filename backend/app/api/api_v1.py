from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.consultations import router as consultations_router
from app.api.doctor import router as doctor_router
from app.api.payments import router as payments_router
from app.api.video import router as video_router
from app.api.templates import router as templates_router
from app.api.pdf_clinica import router as pdf_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(consultations_router, prefix="/consultations", tags=["consultations"])
api_router.include_router(doctor_router, prefix="/doctor", tags=["doctor"])
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])
api_router.include_router(video_router, prefix="/video", tags=["video"])
api_router.include_router(templates_router, prefix="/templates", tags=["templates"])
api_router.include_router(pdf_router, prefix="/pdf", tags=["pdf"])

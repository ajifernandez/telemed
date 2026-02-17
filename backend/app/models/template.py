from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class ClinicalTemplate(Base):
    __tablename__ = "clinical_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=True)
    chief_complaint = Column(Text, nullable=True)
    background = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])

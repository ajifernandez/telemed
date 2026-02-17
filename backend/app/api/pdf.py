from datetime import datetime
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.api.auth import get_current_user
from app.api.doctor import _require_medical_user
from app.db.session import get_db
from app.models.user import Patient, User
from app.models.history import ClinicalRecord
from app.models.consultation import Consultation

router = APIRouter()


def _register_fonts():
    """Register fonts for PDF generation"""
    try:
        # Try to register a nicer font if available
        pdfmetrics.registerFont(TTFont('Helvetica', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    except FileNotFoundError:
        # Fallback to default fonts
        pass


def _create_pdf_stream(content, title="Historia Clínica"):
    """Create PDF stream from content"""
    _register_fonts()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1  # Center
    ))
    styles.add(ParagraphStyle(
        name='CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.darkblue
    ))
    styles.add(ParagraphStyle(
        name='CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    ))

    story = []

    # Title
    story.append(Paragraph(title, styles['CustomTitle']))
    story.append(Spacer(1, 12))

    # Add content
    for item in content:
        if isinstance(item, dict) and item.get('type') == 'table':
            table_data = item['data']
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(table)
            story.append(Spacer(1, 12))
        elif isinstance(item, str):
            story.append(Paragraph(item, styles['CustomNormal']))
        elif isinstance(item, dict) and item.get('type') == 'heading':
            story.append(Paragraph(item['text'], styles['CustomHeading']))
        elif isinstance(item, dict) and item.get('type') == 'spacer':
            story.append(Spacer(1, item['size']))

    doc.build(story)
    buffer.seek(0)
    return buffer


@router.get("/patients/{patient_id}/history/pdf")
def export_patient_history_pdf(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    
    records = (
        db.query(ClinicalRecord)
        .filter(ClinicalRecord.patient_id == patient_id)
        .order_by(ClinicalRecord.created_at.desc())
        .all()
    )
    
    content = []
    
    # Patient info
    content.append({
        'type': 'heading',
        'text': 'Datos del Paciente'
    })
    
    patient_data = [
        ['Campo', 'Valor'],
        ['Nombre Completo', patient.full_name or '—'],
        ['Email', patient.email],
        ['Teléfono', patient.phone or '—'],
        ['ID Paciente', str(patient.id)],
        ['Fecha de Registro', patient.created_at.strftime('%d/%m/%Y')],
    ]
    
    content.append({'type': 'table', 'data': patient_data})
    content.append({'type': 'spacer', 'size': 20})
    
    # Clinical records
    content.append({
        'type': 'heading',
        'text': f'Historia Clínica ({len(records)} notas)'
    })
    
    for i, record in enumerate(records, 1):
        content.append({
            'type': 'heading',
            'text': f'Nota #{record.id} - {record.created_at.strftime("%d/%m/%Y %H:%M")}'
        })
        
        if record.chief_complaint:
            content.append(f"<b>Motivo de Consulta:</b> {record.chief_complaint}")
        
        if record.background:
            content.append(f"<b>Antecedentes:</b> {record.background}")
        
        if record.assessment:
            content.append(f"<b>Valoración:</b> {record.assessment}")
        
        if record.plan:
            content.append(f"<b>Plan:</b> {record.plan}")
        
        if record.allergies:
            content.append(f"<b>Alergias:</b> {record.allergies}")
        
        if record.medications:
            content.append(f"<b>Medicación:</b> {record.medications}")
        
        content.append({'type': 'spacer', 'size': 15})
    
    # Generate PDF
    pdf_buffer = _create_pdf_stream(content, f"Historia Clínica - {patient.full_name or patient.email}")
    
    # Create response
    pdf_data = pdf_buffer.getvalue()
    filename = f"historia_{patient.full_name or patient.email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/consultations/{consultation_id}/pdf")
def export_consultation_pdf(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    
    patient = consultation.patient
    doctor = consultation.staff
    
    content = []
    
    # Title
    content.append({
        'type': 'heading',
        'text': 'Informe de Consulta'
    })
    
    # Consultation info
    consultation_data = [
        ['Campo', 'Valor'],
        ['ID Consulta', str(consultation.id)],
        ['Fecha y Hora', consultation.start_time.strftime('%d/%m/%Y %H:%M')],
        ['Estado', consultation.status],
        ['Tipo', consultation.type or '—'],
        ['Médico', f"Dr. {doctor.full_name or '—'}"],
        ['Especialidad', doctor.specialty or '—'],
    ]
    
    content.append({'type': 'table', 'data': consultation_data})
    content.append({'type': 'spacer', 'size': 20})
    
    # Patient info
    content.append({
        'type': 'heading',
        'text': 'Datos del Paciente'
    })
    
    patient_data = [
        ['Campo', 'Valor'],
        ['Nombre', patient.full_name or '—'],
        ['Email', patient.email],
        ['Teléfono', patient.phone or '—'],
        ['Fecha Nacimiento', patient.date_of_birth.strftime('%d/%m/%Y') if patient.date_of_birth else '—'],
    ]
    
    content.append({'type': 'table', 'data': patient_data})
    content.append({'type': 'spacer', 'size': 20})
    
    # Clinical notes
    if consultation.clinical_notes:
        content.append({
            'type': 'heading',
            'text': 'Notas Clínicas'
        })
        content.append(consultation.clinical_notes)
        content.append({'type': 'spacer', 'size': 20})
    
    # Diagnosis and treatment
    if consultation.diagnosis:
        content.append({
            'type': 'heading',
            'text': 'Diagnóstico'
        })
        content.append(consultation.diagnosis)
        content.append({'type': 'spacer', 'size': 15})
    
    if consultation.treatment:
        content.append({
            'type': 'heading',
            'text': 'Tratamiento'
        })
        content.append(consultation.treatment)
        content.append({'type': 'spacer', 'size': 15})
    
    # Follow-up
    if consultation.follow_up_required:
        content.append({
            'type': 'heading',
            'text': 'Seguimiento Requerido'
        })
        content.append("Sí - Se requiere seguimiento")
        if consultation.follow_up_notes:
            content.append(f"Notas: {consultation.follow_up_notes}")
    
    # Footer
    content.append({'type': 'spacer', 'size': 30})
    content.append("---")
    content.append(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    content.append(f"Sistema: Telemedicina Platform")
    
    # Generate PDF
    pdf_buffer = _create_pdf_stream(content, f"Consulta #{consultation.id} - {patient.full_name or patient.email}")
    
    # Create response
    pdf_data = pdf_buffer.getvalue()
    filename = f"consulta_{consultation.id}_{patient.full_name or patient.email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

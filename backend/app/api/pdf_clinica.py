from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from weasyprint import HTML

from app.api.auth import get_current_user
from app.api.doctor import _require_medical_user
from app.db.session import get_db
from app.models.user import Patient, User
from app.models.history import ClinicalRecord
from app.models.consultation import Consultation

router = APIRouter()


def _generate_complaint_pdf(patient: Patient, complaint: str, records: list[ClinicalRecord]) -> bytes:
    """Generate PDF for specific complaint using WeasyPrint and HTML template from clinica"""
    
    # Format records for display
    records_html = ""
    for i, record in enumerate(records, 1):
        record_date = record.created_at.strftime("%d/%m/%Y %H:%M")
        records_html += f"""
        <div class="section" style="page-break-inside: avoid; margin-bottom: 20px;">
            <div class="section-header">Nota #{i} - {record_date}</div>
            <div class="info-card full-width">
                <div class="info-label">📋 Motivo de consulta</div>
                <div class="info-value">{record.chief_complaint or 'No registrado'}</div>
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">📚 Antecedentes</div>
                    <div class="info-value">{record.background or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">🔍 Valoración</div>
                    <div class="info-value">{record.assessment or 'No registrado'}</div>
                </div>
            </div>
            <div class="info-card full-width">
                <div class="info-label">📝 Plan</div>
                <div class="info-value">{record.plan or 'No registrado'}</div>
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">⚠️ Alergias</div>
                    <div class="info-value">{record.allergies or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">💊 Medicación</div>
                    <div class="info-value">{record.medications or 'No registrado'}</div>
                </div>
            </div>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 1.5cm 2cm;
                @bottom-center {{
                    content: "Página " counter(page) " de " counter(pages);
                    font-size: 8pt;
                    color: #999;
                }}
            }}

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                font-size: 10pt;
                line-height: 1.5;
                color: #2c3e50;
            }}

            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px 30px;
                margin: -1.5cm -2cm 25px -2cm;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }}

            .header-left {{
                flex: 1;
            }}

            .header h1 {{
                font-size: 28pt;
                font-weight: 700;
                margin-bottom: 5px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }}

            .header .subtitle {{
                font-size: 13pt;
                opacity: 0.95;
                font-weight: 300;
            }}

            .document-info {{
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 12px 15px;
                margin-bottom: 20px;
                font-size: 8.5pt;
                color: #6c757d;
            }}

            .section {{
                margin-bottom: 25px;
                page-break-inside: avoid;
            }}

            .section-header {{
                background: linear-gradient(to right, #667eea, #764ba2);
                color: white;
                padding: 10px 15px;
                margin-bottom: 15px;
                border-radius: 5px;
                font-size: 12pt;
                font-weight: 600;
                display: flex;
                align-items: center;
            }}

            .section-header::before {{
                content: "▶";
                margin-right: 10px;
                font-size: 10pt;
            }}

            .info-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 10px;
            }}

            .info-card {{
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }}

            .info-card.full-width {{
                grid-column: 1 / -1;
            }}

            .info-label {{
                font-size: 8pt;
                font-weight: 600;
                color: #667eea;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }}

            .info-value {{
                font-size: 11pt;
                color: #2c3e50;
                font-weight: 500;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }}

            .clinical-notes {{
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                min-height: 250px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }}

            .badge {{
                display: inline-block;
                padding: 6px 14px;
                border-radius: 16px;
                font-size: 10pt;
                font-weight: 600;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                <h1>Telemedicina Platform</h1>
                <div class="subtitle">Historia por Motivo: {complaint}</div>
            </div>
        </div>

        <div class="document-info">
            📄 Documento generado el {datetime.now().strftime("%d/%m/%Y a las %H:%M")} |
            Paciente ID: {patient.id} | {len(records)} notas
        </div>

        <div class="section">
            <div class="section-header">Información del Paciente</div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">👤 Nombre Completo</div>
                    <div class="info-value">{patient.full_name or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">{patient.email}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📞 Teléfono</div>
                    <div class="info-value">{patient.phone or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📅 Fecha de Registro</div>
                    <div class="info-value">{patient.created_at.strftime('%d/%m/%Y')}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">Historia de "{complaint}" ({len(records)} notas)</div>
            {records_html}
        </div>
    </body>
    </html>
    """
    
    return HTML(string=html_content).write_pdf()


def _generate_patient_history_pdf(patient: Patient, records: list[ClinicalRecord]) -> bytes:
    """Generate beautiful PDF for patient history using WeasyPrint and HTML template from clinica"""
    
    # Format records for display
    records_html = ""
    for i, record in enumerate(records, 1):
        record_date = record.created_at.strftime("%d/%m/%Y %H:%M")
        records_html += f"""
        <div class="section" style="page-break-inside: avoid; margin-bottom: 20px;">
            <div class="section-header">Nota Clínica #{i} - {record_date}</div>
            <div class="info-card full-width">
                <div class="info-label">📋 Motivo de Consulta</div>
                <div class="info-value">{record.chief_complaint or 'No registrado'}</div>
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">📚 Antecedentes</div>
                    <div class="info-value">{record.background or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">🔍 Valoración</div>
                    <div class="info-value">{record.assessment or 'No registrado'}</div>
                </div>
            </div>
            <div class="info-card full-width">
                <div class="info-label">📝 Plan</div>
                <div class="info-value">{record.plan or 'No registrado'}</div>
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">⚠️ Alergias</div>
                    <div class="info-value">{record.allergies or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">💊 Medicación</div>
                    <div class="info-value">{record.medications or 'No registrado'}</div>
                </div>
            </div>
        </div>
        """
    
    if not records_html:
        records_html = '<div class="clinical-notes"><p style="color: #adb5bd; font-style: italic;">No se registraron notas clínicas para este paciente.</p></div>'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 1.5cm 2cm;
                @bottom-center {{
                    content: "Página " counter(page) " de " counter(pages);
                    font-size: 8pt;
                    color: #999;
                }}
            }}

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                font-size: 10pt;
                line-height: 1.5;
                color: #2c3e50;
            }}

            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px 30px;
                margin: -1.5cm -2cm 25px -2cm;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }}

            .header-left {{
                flex: 1;
            }}

            .header h1 {{
                font-size: 28pt;
                font-weight: 700;
                margin-bottom: 5px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }}

            .header .subtitle {{
                font-size: 13pt;
                opacity: 0.95;
                font-weight: 300;
            }}

            .document-info {{
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 12px 15px;
                margin-bottom: 20px;
                font-size: 8.5pt;
                color: #6c757d;
            }}

            .section {{
                margin-bottom: 25px;
                page-break-inside: avoid;
            }}

            .section-header {{
                background: linear-gradient(to right, #667eea, #764ba2);
                color: white;
                padding: 10px 15px;
                margin-bottom: 15px;
                border-radius: 5px;
                font-size: 12pt;
                font-weight: 600;
                display: flex;
                align-items: center;
            }}

            .section-header::before {{
                content: "▶";
                margin-right: 10px;
                font-size: 10pt;
            }}

            .info-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 10px;
            }}

            .info-card {{
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }}

            .info-card.full-width {{
                grid-column: 1 / -1;
            }}

            .info-label {{
                font-size: 8pt;
                font-weight: 600;
                color: #667eea;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }}

            .info-value {{
                font-size: 11pt;
                color: #2c3e50;
                font-weight: 500;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }}

            .clinical-notes {{
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                min-height: 250px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }}

            .badge {{
                display: inline-block;
                padding: 6px 14px;
                border-radius: 16px;
                font-size: 10pt;
                font-weight: 600;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                <h1>Telemedicina Platform</h1>
                <div class="subtitle">Historia Clínica Completa</div>
            </div>
        </div>

        <div class="document-info">
            📄 Documento generado el {datetime.now().strftime("%d/%m/%Y a las %H:%M")} |
            Paciente ID: {patient.id}
        </div>

        <div class="section">
            <div class="section-header">Información del Paciente</div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">👤 Nombre Completo</div>
                    <div class="info-value">{patient.full_name or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">{patient.email}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📞 Teléfono</div>
                    <div class="info-value">{patient.phone or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📅 Fecha de Registro</div>
                    <div class="info-value">{patient.created_at.strftime('%d/%m/%Y')}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">Historia Clínica ({len(records)} notas)</div>
            {records_html}
        </div>
    </body>
    </html>
    """
    
    return HTML(string=html_content).write_pdf()


def _generate_consultation_pdf(consultation: Consultation, patient: Patient) -> bytes:
    """Generate beautiful PDF for individual consultation using WeasyPrint and HTML template from clinica"""
    
    consultation_date = consultation.start_time.strftime("%d/%m/%Y %H:%M")
    topic = consultation.type or 'Consulta médica'
    notes_block = consultation.clinical_notes or '<p style="color: #adb5bd; font-style: italic;">No se registraron notas clínicas para esta consulta.</p>'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 1.5cm 2cm;
                @bottom-center {{
                    content: "Página " counter(page) " de " counter(pages);
                    font-size: 8pt;
                    color: #999;
                }}
            }}

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                font-size: 10pt;
                line-height: 1.5;
                color: #2c3e50;
            }}

            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px 30px;
                margin: -1.5cm -2cm 25px -2cm;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }}

            .header-left {{
                flex: 1;
            }}

            .header h1 {{
                font-size: 28pt;
                font-weight: 700;
                margin-bottom: 5px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }}

            .header .subtitle {{
                font-size: 13pt;
                opacity: 0.95;
                font-weight: 300;
            }}

            .document-info {{
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 12px 15px;
                margin-bottom: 20px;
                font-size: 8.5pt;
                color: #6c757d;
            }}

            .section {{
                margin-bottom: 25px;
                page-break-inside: avoid;
            }}

            .section-header {{
                background: linear-gradient(to right, #667eea, #764ba2);
                color: white;
                padding: 10px 15px;
                margin-bottom: 15px;
                border-radius: 5px;
                font-size: 12pt;
                font-weight: 600;
                display: flex;
                align-items: center;
            }}

            .section-header::before {{
                content: "▶";
                margin-right: 10px;
                font-size: 10pt;
            }}

            .info-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 10px;
            }}

            .info-card {{
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }}

            .info-card.full-width {{
                grid-column: 1 / -1;
            }}

            .info-label {{
                font-size: 8pt;
                font-weight: 600;
                color: #667eea;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }}

            .info-value {{
                font-size: 11pt;
                color: #2c3e50;
                font-weight: 500;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }}

            .clinical-notes {{
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                min-height: 250px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }}

            .badge {{
                display: inline-block;
                padding: 6px 14px;
                border-radius: 16px;
                font-size: 10pt;
                font-weight: 600;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                <h1>Telemedicina Platform</h1>
                <div class="subtitle">Informe de Consulta Médica</div>
            </div>
        </div>

        <div class="document-info">
            📄 Documento generado el {datetime.now().strftime("%d/%m/%Y a las %H:%M")} |
            Consulta ID: {consultation.id}
        </div>

        <div class="section">
            <div class="section-header">Información del Paciente</div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">👤 Nombre Completo</div>
                    <div class="info-value">{patient.full_name or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">{patient.email}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📞 Teléfono</div>
                    <div class="info-value">{patient.phone or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📅 Fecha Nacimiento</div>
                    <div class="info-value">{patient.date_of_birth.strftime('%d/%m/%Y') if patient.date_of_birth else 'No registrado'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">Detalles de la Consulta</div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">📅 Fecha y Hora</div>
                    <div class="info-value">{consultation_date}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">🏥 Estado</div>
                    <div class="info-value"><span class="badge">{consultation.status}</span></div>
                </div>
                <div class="info-card">
                    <div class="info-label">👨 Médico</div>
                    <div class="info-value">{consultation.staff.full_name or 'No registrado'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">🏥 Especialidad</div>
                    <div class="info-value"><span class="badge">{consultation.staff.specialty or 'No registrada'}</span></div>
                </div>
            </div>
            <div class="info-card full-width" style="margin-top: 12px;">
                <div class="info-label">📋 Motivo de Consulta</div>
                <div class="info-value" style="white-space: normal; word-wrap: break-word;">{topic}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">Notas Clínicas</div>
            <div class="clinical-notes">{notes_block}</div>
        </div>

        {f'''<div class="section">
            <div class="section-header">Diagnóstico y Tratamiento</div>
            <div class="info-card full-width">
                <div class="info-label">🔍 Diagnóstico</div>
                <div class="info-value">{consultation.diagnosis or 'No registrado'}</div>
            </div>
            <div class="info-card full-width">
                <div class="info-label">💊 Tratamiento</div>
                <div class="info-value">{consultation.treatment or 'No registrado'}</div>
            </div>
        </div>''' if consultation.diagnosis or consultation.treatment else ''}

        {f'''<div class="section">
            <div class="section-header">Seguimiento</div>
            <div class="info-card full-width">
                <div class="info-label">📋 Requiere Seguimiento</div>
                <div class="info-value">{'Sí' if consultation.follow_up_required else 'No'}</div>
            </div>
            {f'''<div class="info-card full-width">
                <div class="info-label">📝 Notas de Seguimiento</div>
                <div class="info-value">{consultation.follow_up_notes or 'No hay notas'}</div>
            </div>''' if consultation.follow_up_required and consultation.follow_up_notes else ''}
        </div>''' if consultation.follow_up_required else ''}

        <div class="section" style="margin-top: 30px;">
            <div style="text-align: center; color: #999; font-size: 8pt;">
                ---<br>
                Generado el {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}<br>
                Sistema: Telemedicina Platform
            </div>
        </div>
    </body>
    </html>
    """
    
    return HTML(string=html_content).write_pdf()


@router.get("/patients/{patient_id}/complaint/{complaint}/pdf")
def export_patient_complaint_pdf(
    patient_id: int,
    complaint: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_medical_user(current_user)
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    
    # Filter records by specific complaint (case-insensitive)
    records = (
        db.query(ClinicalRecord)
        .filter(ClinicalRecord.patient_id == patient_id)
        .filter(
            ClinicalRecord.chief_complaint.ilike(f"%{complaint}%")
        )
        .order_by(ClinicalRecord.created_at.desc())
        .all()
    )
    
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No records found for this complaint")
    
    # Generate PDF using the beautiful HTML template
    pdf_bytes = _generate_complaint_pdf(patient, complaint, records)
    
    # Create response
    safe_complaint = complaint.replace(' ', '_').replace('/', '_')[:20]
    filename = f"{safe_complaint}_{patient.full_name or patient.email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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
    
    # Generate PDF using the beautiful HTML template
    pdf_bytes = _generate_patient_history_pdf(patient, records)
    
    # Create response
    filename = f"historia_{patient.full_name or patient.email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return Response(
        content=pdf_bytes,
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
    
    # Generate PDF using the beautiful HTML template
    pdf_bytes = _generate_consultation_pdf(consultation, patient)
    
    # Create response
    filename = f"consulta_{consultation.id}_{patient.full_name or patient.email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

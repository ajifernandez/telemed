"""
Script simple para crear consultas de ejemplo con enlaces Jitsi
"""
import os
import sys
from datetime import datetime, timedelta

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User, Patient
from app.models.consultation import Consultation, ConsultationStatus
import secrets
import string

def generate_room_name():
    """Generate a random room name for Jitsi"""
    return ''.join(secrets.choice(string.ascii_lowercase) for _ in range(12))

def generate_jitsi_url(room_name: str) -> str:
    """Generate Jitsi meeting URL"""
    return f"https://meet.jit.si/{room_name}"

def create_sample_consultations():
    """Create sample consultations with Jitsi links"""
    db = SessionLocal()
    
    try:
        # Get first doctor (medical professional)
        doctor = db.query(User).filter(User.is_medical_professional == True).first()
        if not doctor:
            print("❌ No medical professional found. Please create one first.")
            return
        
        # Get all patients
        patients = db.query(Patient).all()
        if not patients:
            print("❌ No patients found. Please create some patients first.")
            return
        
        print(f"📅 Creating sample consultations for Dr. {doctor.full_name}")
        print(f"👥 Found {len(patients)} patients")
        
        # Sample specialties and reasons
        specialties = [
            "Medicina General",
            "Cardiología", 
            "Pediatría",
            "Dermatología",
            "Psicología",
            "Ginecología",
            "Oftalmología"
        ]
        
        reasons = [
            "Dolor de cabeza persistente",
            "Chequeo anual de rutina",
            "Fiebre y tos",
            "Problemas de sueño",
            "Dolor abdominal",
            "Revisión de medicación",
            "Consulta de seguimiento",
            "Dolor en el pecho",
            "Problemas de ansiedad",
            "Lesión deportiva"
        ]
        
        consultations_created = 0
        
        # Create consultations for different dates
        today = datetime.now()
        dates = [
            today.replace(hour=9, minute=0),    # 9:00 AM today
            today.replace(hour=10, minute=30),  # 10:30 AM today
            today.replace(hour=14, minute=0),   # 2:00 PM today
            today.replace(hour=16, minute=30),  # 4:30 PM today
            today + timedelta(days=1, hour=9, minute=0),  # 9:00 AM tomorrow
            today + timedelta(days=1, hour=11, minute=0),  # 11:00 AM tomorrow
            today + timedelta(days=2, hour=10, minute=0),  # 10:00 AM in 2 days
            today + timedelta(days=3, hour=15, minute=30), # 3:30 PM in 3 days
        ]
        
        for i, patient in enumerate(patients[:8]):  # Create up to 8 consultations
            if i >= len(dates):
                break
                
            scheduled_time = dates[i]
            specialty = specialties[i % len(specialties)]
            reason = reasons[i % len(reasons)]
            
            # Generate Jitsi room details
            room_name = generate_room_name()
            room_url = generate_jitsi_url(room_name)
            
            # Determine status based on time
            if scheduled_time < today:
                status = ConsultationStatus.COMPLETED
            elif scheduled_time < today + timedelta(hours=1):
                status = ConsultationStatus.IN_PROGRESS
            else:
                status = ConsultationStatus.CONFIRMED
            
            consultation = Consultation(
                patient_id=patient.id,
                doctor_id=doctor.id,
                consultation_type="video",
                specialty=specialty,
                reason_for_visit=reason,
                scheduled_at=scheduled_time,
                duration_minutes=30,
                status=status,
                jitsi_room_name=room_name,
                jitsi_room_url=room_url,
                notes=f"Consulta de {specialty} - {reason.lower()}"
            )
            
            db.add(consultation)
            consultations_created += 1
            
            print(f"✅ Created consultation: {patient.full_name} - {specialty}")
            print(f"   📅 {scheduled_time.strftime('%Y-%m-%d %H:%M')}")
            print(f"   🎥 Jitsi: {room_url}")
            print(f"   📊 Status: {status}")
            print()
        
        db.commit()
        print(f"🎉 Successfully created {consultations_created} sample consultations!")
        
        # Print summary
        print("\n📊 Consultation Summary:")
        print("=" * 50)
        for consultation in db.query(Consultation).all():
            patient = db.query(Patient).filter(Patient.id == consultation.patient_id).first()
            print(f"👤 {patient.full_name}")
            print(f"📅 {consultation.scheduled_at.strftime('%Y-%m-%d %H:%M')}")
            print(f"🏥 {consultation.specialty}")
            print(f"💬 {consultation.reason_for_visit}")
            print(f"🎥 {consultation.jitsi_room_url}")
            print(f"📊 Status: {consultation.status}")
            print("-" * 50)
        
        print("\n🔗 Jitsi Links for Testing:")
        print("=" * 50)
        for consultation in db.query(Consultation).all():
            print(f"{consultation.jitsi_room_url}")
        
    except Exception as e:
        print(f"❌ Error creating consultations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_consultations()

"""
Script SQL para crear consultas de ejemplo con enlaces Jitsi
"""
import os
import sys
from datetime import datetime, timedelta
import secrets
import string

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text
import os

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://telemed_user:b4e8991c53e21f145e64890c9605733b@localhost:5432/telemed_db')

def generate_room_name():
    """Generate a random room name for Jitsi"""
    return ''.join(secrets.choice(string.ascii_lowercase) for _ in range(12))

def generate_jitsi_url(room_name: str) -> str:
    """Generate Jitsi meeting URL"""
    return f"https://meet.jit.si/{room_name}"

def create_sample_consultations():
    """Create sample consultations with Jitsi links using raw SQL"""
    db = SessionLocal()
    
    try:
        # Get doctor and patient IDs using raw SQL
        doctor_result = db.execute(text("""
            SELECT id, full_name FROM users 
            WHERE is_medical_professional = TRUE 
            LIMIT 1
        """))
        
        doctor_row = doctor_result.fetchone()
        if not doctor_row:
            print("❌ No medical professional found. Please create one first.")
            return
        
        doctor_id, doctor_name = doctor_row
        
        patients_result = db.execute(text("""
            SELECT id, full_name FROM patients 
            ORDER BY id 
            LIMIT 8
        """))
        
        patients = patients_result.fetchall()
        if not patients:
            print("❌ No patients found. Please create some patients first.")
            return
        
        print(f"📅 Creating sample consultations for Dr. {doctor_name}")
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
        
        # Create consultations for different dates
        today = datetime.now()
        dates = [
            datetime(today.year, today.month, today.day, 9, 0),    # 9:00 AM today
            datetime(today.year, today.month, today.day, 10, 30),  # 10:30 AM today
            datetime(today.year, today.month, today.day, 14, 0),   # 2:00 PM today
            datetime(today.year, today.month, today.day, 16, 30), # 4:30 PM today
            datetime(today.year, today.month, today.day + 1, 9, 0),  # 9:00 AM tomorrow
            datetime(today.year, today.month, today.day + 1, 11, 0), # 11:00 AM tomorrow
            datetime(today.year, today.month, today.day + 2, 10, 0), # 10:00 AM in 2 days
            datetime(today.year, today.month, today.day + 3, 15, 30), # 3:30 PM in 3 days
        ]
        
        consultations_created = 0
        
        for i, (patient_id, patient_name) in enumerate(patients):
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
                status = "completed"
            elif scheduled_time < today + timedelta(hours=1):
                status = "in_progress"
            else:
                status = "confirmed"
            
            # Insert consultation using raw SQL
            db.execute(text("""
                INSERT INTO consultations (
                    patient_id, doctor_id, consultation_type, specialty, 
                    reason_for_visit, scheduled_at, duration_minutes, status,
                    jitsi_room_name, jitsi_room_url, notes, 
                    created_at, updated_at
                ) VALUES (
                    :patient_id, :doctor_id, 'video', :specialty,
                    :reason, :scheduled_at, 30, :status,
                    :room_name, :room_url, :notes,
                    NOW(), NOW()
                )
            """), {
                'patient_id': patient_id,
                'doctor_id': doctor_id,
                'specialty': specialty,
                'reason': reason,
                'scheduled_at': scheduled_time,
                'status': status,
                'room_name': room_name,
                'room_url': room_url,
                'notes': f"Consulta de {specialty} - {reason.lower()}"
            })
            
            consultations_created += 1
            
            print(f"✅ Created consultation: {patient_name} - {specialty}")
            print(f"   📅 {scheduled_time.strftime('%Y-%m-%d %H:%M')}")
            print(f"   🎥 Jitsi: {room_url}")
            print(f"   📊 Status: {status}")
            print()
        
        db.commit()
        print(f"🎉 Successfully created {consultations_created} sample consultations!")
        
        # Print summary
        print("\n📊 Consultation Summary:")
        print("=" * 50)
        
        consultations_result = db.execute(text("""
            SELECT c.id, c.scheduled_at, c.specialty, c.reason_for_visit, 
                   c.jitsi_room_url, c.status, p.full_name
            FROM consultations c
            JOIN patients p ON c.patient_id = p.id
            ORDER BY c.scheduled_at DESC
        """))
        
        consultations = consultations_result.fetchall()
        for consultation in consultations:
            print(f"👤 {consultation[6]}")
            print(f"📅 {consultation[1].strftime('%Y-%m-%d %H:%M')}")
            print(f"🏥 {consultation[2]}")
            print(f"💬 {consultation[3]}")
            print(f"🎥 {consultation[4]}")
            print(f"📊 Status: {consultation[5]}")
            print("-" * 50)
        
        print("\n🔗 Jitsi Links for Testing:")
        print("=" * 50)
        for consultation in consultations:
            print(f"{consultation[4]}")
        
        print("\n🎯 Testing Instructions:")
        print("=" * 50)
        print("1. Go to: http://localhost:3000/app/doctor")
        print("2. Login as doctor")
        print("3. Click on any consultation in the agenda")
        print("4. The Jitsi link will take you to the video call")
        print("5. Test with different browsers/devices")
        
    except Exception as e:
        print(f"❌ Error creating consultations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_consultations()

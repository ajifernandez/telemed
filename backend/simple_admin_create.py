"""
Script simple para crear usuarios admin usando SQL directo
"""
import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text
from app.core.security import get_password_hash

def create_admin_users():
    """Create admin users using raw SQL"""
    db = SessionLocal()
    
    try:
        # IT Admin user
        it_admin_email = os.getenv('IT_ADMIN_EMAIL', 'it_admin@demo.com')
        it_admin_password = os.getenv('IT_ADMIN_PASSWORD', 'ChangeMe123!')
        it_admin_full_name = os.getenv('IT_ADMIN_FULL_NAME', 'IT Administrator')
        
        # Check if IT admin exists
        result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": it_admin_email})
        if not result.fetchone():
            # Create IT admin
            db.execute(text("""
                INSERT INTO users (
                    email, hashed_password, full_name, role, is_active, 
                    is_superuser, is_medical_professional, is_first_login, 
                    created_at, updated_at
                ) VALUES (
                    :email, :password, :full_name, :role, :is_active,
                    :is_superuser, :is_medical_professional, :is_first_login,
                    NOW(), NOW()
                )
            """), {
                "email": it_admin_email,
                "password": get_password_hash(it_admin_password),
                "full_name": it_admin_full_name,
                "role": "it_admin",
                "is_active": True,
                "is_superuser": False,
                "is_medical_professional": False,
                "is_first_login": False
            })
            print(f"✅ Created IT Admin: {it_admin_email}")
        else:
            print(f"ℹ️  IT Admin already exists: {it_admin_email}")
        
        # Medical Admin user
        medical_admin_email = 'medical_admin@demo.com'
        medical_admin_password = 'ChangeMe123!'
        medical_admin_full_name = 'Medical Administrator'
        
        # Check if Medical admin exists
        result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": medical_admin_email})
        if not result.fetchone():
            # Create Medical admin
            db.execute(text("""
                INSERT INTO users (
                    email, hashed_password, full_name, role, is_active, 
                    is_superuser, is_medical_professional, is_first_login, 
                    created_at, updated_at
                ) VALUES (
                    :email, :password, :full_name, :role, :is_active,
                    :is_superuser, :is_medical_professional, :is_first_login,
                    NOW(), NOW()
                )
            """), {
                "email": medical_admin_email,
                "password": get_password_hash(medical_admin_password),
                "full_name": medical_admin_full_name,
                "role": "medical_admin",
                "is_active": True,
                "is_superuser": False,
                "is_medical_professional": False,
                "is_first_login": False
            })
            print(f"✅ Created Medical Admin: {medical_admin_email}")
        else:
            print(f"ℹ️  Medical Admin already exists: {medical_admin_email}")
        
        db.commit()
        
        print("\n🎉 Admin users created successfully!")
        print("\n📋 Login Credentials:")
        print("=" * 50)
        print("🔧 IT Admin:")
        print(f"   Email: {it_admin_email}")
        print(f"   Password: {it_admin_password}")
        print(f"   Full Name: {it_admin_full_name}")
        print(f"   Role: it_admin")
        print()
        print("🏥 Medical Admin:")
        print(f"   Email: {medical_admin_email}")
        print(f"   Password: {medical_admin_password}")
        print(f"   Full Name: {medical_admin_full_name}")
        print(f"   Role: medical_admin")
        print()
        print("👨‍⚕️ Doctor (already exists):")
        print("   Email: beatrizjc87@gmail.com")
        print("   Password: ChangeMe123!")
        print("   Role: specialist")
        print("=" * 50)
        
        print("\n🎯 Testing URLs:")
        print("=" * 50)
        print("🏠 Landing: http://localhost:3000/")
        print("🔐 Login: http://localhost:3000/login")
        print("📅 Reserva: http://localhost:3000/reserva")
        print("👨‍⚕️ Doctor: http://localhost:3000/app/doctor")
        print("🏥 Admin: http://localhost:3000/app/admin")
        print("🔧 IT: http://localhost:3000/app/it/medical-professionals")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error creating admin users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_users()

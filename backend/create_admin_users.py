"""
Script para crear usuarios admin por defecto
"""
import os
import sys
from sqlalchemy.orm import Session

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin_users():
    """Create admin users if they don't exist"""
    db = SessionLocal()
    
    try:
        # IT Admin user
        it_admin_email = os.getenv('IT_ADMIN_EMAIL', 'it_admin@demo.com')
        it_admin_password = os.getenv('IT_ADMIN_PASSWORD', 'ChangeMe123!')
        it_admin_full_name = os.getenv('IT_ADMIN_FULL_NAME', 'IT Administrator')
        
        it_admin = db.query(User).filter(User.email == it_admin_email).first()
        if not it_admin:
            it_admin = User(
                email=it_admin_email,
                hashed_password=get_password_hash(it_admin_password),
                full_name=it_admin_full_name,
                role='it_admin',
                is_active=True,
                is_superuser=False,
                is_medical_professional=False,
                is_first_login=False
            )
            db.add(it_admin)
            print(f"✅ Created IT Admin: {it_admin_email}")
        else:
            print(f"ℹ️  IT Admin already exists: {it_admin_email}")
        
        # Medical Admin user
        medical_admin_email = 'medical_admin@demo.com'
        medical_admin_password = 'ChangeMe123!'
        medical_admin_full_name = 'Medical Administrator'
        
        medical_admin = db.query(User).filter(User.email == medical_admin_email).first()
        if not medical_admin:
            medical_admin = User(
                email=medical_admin_email,
                hashed_password=get_password_hash(medical_admin_password),
                full_name=medical_admin_full_name,
                role='medical_admin',
                is_active=True,
                is_superuser=False,
                is_medical_professional=False,
                is_first_login=False
            )
            db.add(medical_admin)
            print(f"✅ Created Medical Admin: {medical_admin_email}")
        else:
            print(f"ℹ️  Medical Admin already exists: {medical_admin_email}")
        
        db.commit()
        
        print("\n🎉 Admin users created successfully!")
        print("\n📋 Login Credentials:")
        print("=" * 50)
        print(f"🔧 IT Admin:")
        print(f"   Email: {it_admin_email}")
        print(f"   Password: {it_admin_password}")
        print(f"   Full Name: {it_admin_full_name}")
        print(f"   Role: it_admin")
        print()
        print(f"🏥 Medical Admin:")
        print(f"   Email: {medical_admin_email}")
        print(f"   Password: {medical_admin_password}")
        print(f"   Full Name: {medical_admin_full_name}")
        print(f"   Role: medical_admin")
        print()
        print(f"👨‍⚕️ Doctor (already exists):")
        print(f"   Email: beatrizjc87@gmail.com")
        print(f"   Password: ChangeMe123!")
        print(f"   Role: specialist")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error creating admin users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_users()

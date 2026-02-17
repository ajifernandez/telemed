
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.models.user import User
from app.api.auth import get_current_user

# Mock database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Mock current user to be it_admin
def override_get_current_user():
    return User(id=1, email="admin@example.com", role="it_admin", is_active=True, is_superuser=False)

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create a medical professional
    mp = User(
        email="doctor@example.com",
        full_name="Doctor Strange",
        role="specialist",
        is_medical_professional=True,
        license_number="OLD123",
        is_active=True
    )
    db.add(mp)
    db.commit()
    db.close()

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)

def test_update_license_number():
    # First get the user to find their ID
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "doctor@example.com").first()
    assert user is not None
    user_id = user.id
    db.close()

    # Attempt to update license number
    response = client.patch(
        f"/api/v1/admin/medical-professionals/{user_id}",
        json={"license_number": "NEW456"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # This assertion is expected to fail currently
    assert data.get("license_number") == "NEW456", f"Expected NEW456, got {data.get('license_number')}"

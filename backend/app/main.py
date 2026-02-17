import os
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1 import api_router
from app.core.security import get_password_hash
from app.db.session import Base, SessionLocal, engine
from app.models import consultation  # noqa: F401
from app.models.user import User, Patient
from app.models.history import ClinicalRecord
from app.models.template import ClinicalTemplate

app = FastAPI(
    title="Telemedicine Platform",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


@app.on_event("startup")
def startup_event():
    if os.getenv("RESET_DB", "0") == "1":
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    elif os.getenv("AUTO_CREATE_TABLES", "1") == "1":
        Base.metadata.create_all(bind=engine)

    it_email = os.getenv("IT_ADMIN_EMAIL")
    it_password = os.getenv("IT_ADMIN_PASSWORD")
    it_full_name = os.getenv("IT_ADMIN_FULL_NAME", "IT Admin")

    if it_email and it_password:
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.email == it_email).first()
            if not existing:
                db.add(
                    User(
                        email=it_email,
                        hashed_password=get_password_hash(it_password),
                        is_active=True,
                        is_superuser=True,
                        is_medical_professional=False,
                        role="it_admin",
                        full_name=it_full_name,
                        is_first_login=False,
                    )
                )
                db.commit()
            else:
                existing.role = "it_admin"
                existing.is_superuser = True
                db.commit()
        finally:
            db.close()

    if os.getenv("SEED_DEMO_DATA", "0") == "1":
        db = SessionLocal()
        try:
            doctor_email = os.getenv("DEFAULT_DOCTOR_EMAIL", "beatrizjc87@gmail.com")
            doctor_full_name = os.getenv(
                "DEFAULT_DOCTOR_FULL_NAME", "Beatriz Jiménez Canet"
            )
            doctor_specialty = os.getenv("DEFAULT_DOCTOR_SPECIALTY", "Medicina de familia")
            doctor_password = os.getenv("DEFAULT_DOCTOR_PASSWORD", "ChangeMe123!")
            force_doctor_password = os.getenv("FORCE_DEFAULT_DOCTOR_PASSWORD", "0") == "1"

            print(
                "Demo seed enabled: "
                f"doctor_email={doctor_email} "
                f"force_doctor_password={force_doctor_password} "
                f"target_patients={os.getenv('DEMO_PATIENTS_COUNT', '100')}"
            )

            doctor = db.query(User).filter(User.email == doctor_email).first()
            if not doctor:
                doctor = User(
                    email=doctor_email,
                    hashed_password=get_password_hash(doctor_password),
                    is_active=True,
                    is_superuser=False,
                    is_medical_professional=True,
                    role="specialist",
                    full_name=doctor_full_name,
                    specialty=doctor_specialty,
                    is_first_login=False,
                )
                db.add(doctor)
                db.commit()
                db.refresh(doctor)
                print(f"Demo seed: created default doctor {doctor_email}")
            elif force_doctor_password:
                doctor.hashed_password = get_password_hash(doctor_password)
                doctor.is_active = True
                doctor.is_medical_professional = True
                doctor.role = doctor.role or "specialist"
                doctor.is_first_login = False
                db.commit()
                print(f"Demo seed: updated password for default doctor {doctor_email}")
            else:
                print(f"Demo seed: default doctor exists {doctor_email}")

            # Seed demo patients and clinical records
            target_patients = int(os.getenv("DEMO_PATIENTS_COUNT", "100"))
            existing_patients = db.query(Patient).count()
            created = 0
            if existing_patients < target_patients:
                import random

                to_create = target_patients - existing_patients
                print(
                    f"Demo seed: patients existing={existing_patients} "
                    f"target={target_patients} to_create={to_create}"
                )

                first_names = [
                    "María",
                    "Lucía",
                    "Paula",
                    "Carmen",
                    "Sara",
                    "Laura",
                    "Elena",
                    "Claudia",
                    "Ana",
                    "Marta",
                    "Juan",
                    "Luis",
                    "Pedro",
                    "Carlos",
                    "Javier",
                    "Daniel",
                    "Sergio",
                    "Manuel",
                    "Alberto",
                    "Diego",
                ]
                last_names = [
                    "García",
                    "Fernández",
                    "González",
                    "Rodríguez",
                    "López",
                    "Martínez",
                    "Sánchez",
                    "Pérez",
                    "Gómez",
                    "Ruiz",
                    "Hernández",
                    "Jiménez",
                    "Díaz",
                    "Moreno",
                    "Álvarez",
                    "Muñoz",
                ]

                complaints = [
                    "Fiebre y malestar general",
                    "Dolor de garganta",
                    "Tos persistente",
                    "Dolor lumbar",
                    "Cefalea",
                    "Dolor abdominal",
                    "Insomnio",
                    "Ansiedad",
                    "Revisión de HTA",
                    "Control de diabetes",
                ]
                backgrounds = [
                    "No antecedentes de interés",
                    "HTA",
                    "Diabetes tipo 2",
                    "Asma",
                    "Dislipemia",
                    "Hipotiroidismo",
                    "Migraña",
                    "Ansiedad",
                ]
                plans = [
                    "Reposo e hidratación. Paracetamol si precisa.",
                    "Solicitar analítica básica y control en 7 días.",
                    "Derivar a especialista si no mejora en 2 semanas.",
                    "Ajuste de tratamiento y control de constantes.",
                    "Educación sanitaria y seguimiento.",
                ]
                allergies = [
                    "Sin alergias conocidas",
                    "Alergia a penicilina",
                    "Alergia a AINEs",
                    "Alergia estacional (polen)",
                ]
                medications = [
                    "Ninguna",
                    "Enalapril 10mg",
                    "Metformina 850mg",
                    "Salbutamol inhalador",
                    "Atorvastatina 20mg",
                    "Levotiroxina 50mcg",
                ]

                for i in range(target_patients - existing_patients):
                    first_name = random.choice(first_names)
                    last_name = random.choice(last_names)
                    email = f"{first_name.lower()}.{last_name.lower()}{i + existing_patients}@demo.com"
                    phone = f"6{random.randint(10000000, 99999999)}"
                    patient = Patient(
                        full_name=f"{first_name} {last_name}",
                        email=email,
                        phone=phone,
                    )
                    db.add(patient)
                    db.flush()

                    # Add 1-3 clinical records per patient
                    for _ in range(random.randint(1, 3)):
                        db.add(
                            ClinicalRecord(
                                patient_id=patient.id,
                                chief_complaint=random.choice(complaints),
                                background=random.choice(backgrounds),
                                assessment="Evolución favorable. Sin signos de alarma.",
                                plan=random.choice(plans),
                                allergies=random.choice(allergies),
                                medications=random.choice(medications),
                            )
                        )
                    db.commit()

                    created += 1

                print(
                    f"Seeded demo data: doctor={doctor_email} patients_created={created}"
                )
            else:
                print("Demo seed: no patients created")

            # Seed demo clinical templates
            print("Seeding demo clinical templates...")
            existing_templates = db.query(ClinicalTemplate).count()
            if existing_templates == 0:
                demo_templates = [
                    ClinicalTemplate(
                        name="Hipertensión arterial",
                        description="Control y seguimiento de HTA",
                        chief_complaint="Hipertensión arterial",
                        background="Paciente con diagnóstico de HTA en tratamiento. No adherencia al tratamiento.",
                        assessment="HTA no controlada. Riesgo cardiovascular elevado.",
                        plan="Reforzar adherencia a medicación. Cambio de estilo de vida. Control de TA en 4 semanas.",
                        allergies="Ninguna conocida",
                        medications="Losartán 50 mg/día, AAS 100 mg/día",
                        created_at=datetime.utcnow(),
                        created_by_id=doctor.id,
                    ),
                    ClinicalTemplate(
                        name="Diabetes mellitus tipo 2",
                        description="Seguimiento de DM2",
                        chief_complaint="Diabetes mellitus tipo 2",
                        background="Paciente diabético con mal control glucémico. Sedentarismo.",
                        assessment="DM2 descompensada. Riesgo de complicaciones crónicas.",
                        plan="Ajuste de metformina. Dieta low-carb. Ejercicio 30 min/día. "
                        "Hemoglobina glicosilada en 3 meses.",
                        allergies="Ninguna conocida",
                        medications="Metformina 850 mg BID, Sitagliptina 100 mg/día",
                        created_at=datetime.utcnow(),
                        created_by_id=doctor.id,
                    ),
                    ClinicalTemplate(
                        name="Infección respiratoria aguda",
                        description="Cuadro gripal/resfriado común",
                        chief_complaint="Tos, fiebre y malestar general",
                        background="Cuadro de 3 días de evolución. Contacto con casos similares.",
                        assessment="Infección viral de vías aéreas superiores. Sin neumonía.",
                        plan="Tratamiento sintomático. Reposo. Hidratación. Reevaluar si persiste fiebre >5 días.",
                        allergies="Penicilina",
                        medications="Paracetamol 500 mg c/6h si dolor/fiebre",
                        created_at=datetime.utcnow(),
                        created_by_id=doctor.id,
                    ),
                    ClinicalTemplate(
                        name="Ansiedad/estrés",
                        description="Trastorno de ansiedad generalizada",
                        chief_complaint="Ansiedad y dificultad para dormir",
                        background="Paciente refiere estrés laboral. Irritabilidad. Palpitaciones.",
                        assessment="Trastorno de ansiedad generalizada. Sin depresión mayor.",
                        plan="Técnicas de relajación. Ejercicio regular. Considerar psicoterapia. "
                        "Reevaluar en 4 semanas.",
                        allergies="Ninguna conocida",
                        medications="Sin medicación actual. Valorar SSRIs si no mejora.",
                        created_at=datetime.utcnow(),
                        created_by_id=doctor.id,
                    ),
                    ClinicalTemplate(
                        name="Dolor lumbar crónico",
                        description="Lumbalgia mecánica crónica",
                        chief_complaint="Dolor lumbar crónico",
                        background="Dolor >6 meses. Empeora con sedestación prolongada. No irradiación a piernas.",
                        assessment="Lumbalgia mecánica crónica. Sin signos de alarma neurológicos.",
                        plan="Fisioterapia. Ejercicios de core. Evitar sedestación prolongada. NSAIDs puntuales.",
                        allergies="Ibuprofeno",
                        medications="Paracetamol 1 g c/8h si dolor, Metocarbamol 400 mg c/8h si contractura",
                        created_at=datetime.utcnow(),
                        created_by_id=doctor.id,
                    ),
                ]
                for t in demo_templates:
                    db.add(t)
                db.commit()
                print(f"Created {len(demo_templates)} demo templates")
            else:
                print(f"Templates already exist ({existing_templates}), skipping template seed")
        except Exception as e:
            print(f"Error during demo seed: {e}")
            db.rollback()
        finally:
            db.close()


origins = [
    "http://localhost",
    "http://localhost:3000",
    "https://yourdomain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api/v1")

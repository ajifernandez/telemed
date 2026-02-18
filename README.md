# Telemed - Sistema de Citas Médicas

Un sistema completo de gestión de citas médicas con consultas por video, diseñado para ser desplegado de forma independiente y cumplir con RGPD/GDPR.

## Características Principales

✅ **Sistema Multi-Rol** - Paneles separados para IT Admin, Admin Médico y Doctores  
✅ **Autenticación Segura** - Registro con contraseñas temporales y gestión de roles  
✅ **Consultas por Video** - Integración con Jitsi Meet y gestión de salas  
✅ **Historial Clínico** - Registros médicos completos con plantillas personalizables  
✅ **Generación de PDFs** - Exportación de historiales y consultas  
✅ **Cumplimiento RGPD** - Cifrado AES-256 para datos de pacientes  
✅ **Procesamiento de Pagos** - Integración con Stripe y webhooks  
✅ **Notificaciones por Email** - Emails transaccionales con SendGrid  
✅ **Gestión de Consultas** - Sistema completo de reservas y programación  
✅ **Reservas Públicas** - Sistema de reserva de citas para pacientes  
✅ **Basado en Docker** - Fácil despliegue y mantenimiento  
✅ **Auto-alojado** - Control total sobre tus datos  

## Stack Tecnológico

- **Backend**: FastAPI (Python 3.11+), SQLAlchemy, PostgreSQL
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Infraestructura**: Docker Compose, Nginx, Certbot
- **Seguridad**: Fernet (AES-256), JWT, bcrypt

## Inicio Rápido

### Prerrequisitos
- Docker & Docker Compose
- Python 3.11+ (para desarrollo local)
- Node.js 18+ (para desarrollo frontend)
- Nombre de dominio con DNS configurado (para producción)
- Puertos 80, 443, 10000 (UDP) redirigidos (para producción)

### Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/ajifernandez/telemed.git
cd telemed

# 2. Generar secrets y archivo .env
make setup

# 3. Verificar requisitos del sistema
make check

# 4. Editar .env con tus API keys
nano .env
# Requeridos: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SENDGRID_API_KEY, JITSI_DOMAIN

# 5. Desplegar la plataforma
make deploy
```

### Acceder a la Plataforma
- **Página Principal**: http://localhost:8080 (Landing page y acceso)
- **Panel IT**: http://localhost:8080/it/medical-professionals (Gestión de profesionales)
- **Panel Admin**: http://localhost:8080/admin (Gestión de pacientes y consultas)
- **Panel Doctor**: http://localhost:8080/doctor (Dashboard médico)
- **Reserva de Citas**: http://localhost:8080/reserva o http://localhost:8080/booking
- **API Docs**: http://localhost:8080/api/docs

## Estructura del Proyecto

```
.
├── backend/           # Aplicación FastAPI
│   ├── app/
│   │   ├── api/       # Endpoints API
│   │   │   ├── auth.py          # Autenticación y login
│   │   │   ├── admin.py         # Gestión administrativa
│   │   │   ├── doctor.py        # Endpoints para doctores
│   │   │   ├── consultations.py # Gestión de consultas
│   │   │   ├── payments.py      # Integración Stripe
│   │   │   ├── video.py         # Integración Jitsi
│   │   │   ├── templates.py    # Plantillas clínicas
│   │   │   ├── pdf_clinica.py  # Generación de PDFs
│   │   │   └── pdf.py          # PDFs alternativos
│   │   ├── core/      # Seguridad, configuración
│   │   ├── db/        # Sesión de base de datos
│   │   ├── models/    # Modelos SQLAlchemy
│   │   │   ├── user.py          # Usuarios y pacientes
│   │   │   ├── consultation.py # Consultas y pagos
│   │   │   ├── history.py      # Historial clínico
│   │   │   └── template.py     # Plantillas clínicas
│   │   ├── schemas/   # Schemas Pydantic
│   │   ├── services/  # Servicio de email
│   │   └── main.py    # App FastAPI
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # Aplicación Next.js
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Login unificado
│   │   ├── reserva/           # Reserva de citas
│   │   ├── booking/           # Sistema de reservas alternativo
│   │   ├── admin/             # Panel administrativo
│   │   ├── doctor/            # Panel médico
│   │   │   ├── page.tsx       # Dashboard principal
│   │   │   ├── patients/      # Gestión de pacientes
│   │   │   ├── consultations/ # Gestión de consultas
│   │   │   ├── agenda/        # Agenda médica
│   │   │   ├── templates/    # Plantillas clínicas
│   │   │   └── payments/      # Pagos recibidos
│   │   ├── it/                # Panel IT
│   │   │   └── medical-professionals/ # Gestión de profesionales
│   │   ├── dashboard/         # Dashboard alternativo
│   │   └── video-room/         # Sala de videoconsulta
│   ├── Dockerfile
│   └── package.json
├── infra/             # Infraestructura
│   ├── docker-compose.yml
│   └── nginx/         # Configuración reverse proxy
├── docs/              # Documentación
│   ├── AUTHENTICATION.md
│   ├── SYSTEM_OVERVIEW.md
│   ├── MAINTENANCE.md
│   └── LEGAL_RGPD.md
└── Makefile           # Comandos de automatización
```

## Comandos Makefile

```bash
# Comandos de despliegue
make setup           # Generar .env y claves de cifrado
make check           # Verificar requisitos y configuración
make deploy          # Iniciar todos los servicios
make down            # Detener todos los servicios
make logs            # Ver logs
make backup          # Crear backup cifrado de base de datos

# Comandos de desarrollo
make venv            # Crear entorno virtual con uv
make requirements    # Instalar dependencias backend
make requirements-frontend # Instalar dependencias frontend
make requirements-test # Instalar dependencias de test
make lint            # Ejecutar linting de código
make unit-tests      # Ejecutar tests unitarios
make debug           # Ejecutar backend con debugpy
make debug-frontend  # Ejecutar frontend en modo desarrollo
make debug-db        # Iniciar solo la base de datos
make multidebug      # Iniciar db + backend debug + frontend dev
```

## Características de Seguridad

### Cifrado en Reposo
- Nombres, emails y teléfonos de pacientes cifrados con AES-256 (Fernet)
- Clave de cifrado almacenada en variables de entorno
- TypeDecorator personalizado SQLAlchemy para cifrado/descifrado transparente

### Cifrado en Tránsito
- HTTPS/TLS para todo el tráfico web
- Jitsi Meet usa DTLS-SRTP para streams de video

### Control de Acceso
- Autenticación basada en JWT
- Hashing de contraseñas con bcrypt
- Control de acceso basado en roles (RBAC)
- **Roles del Sistema**:
  - `it_admin`: Administrador IT (gestión de profesionales médicos)
  - `medical_admin` / `admin`: Administrador médico (gestión de pacientes y consultas)
  - `specialist` / `doctor`: Profesional médico (acceso a pacientes y consultas propias)

## Características Adicionales

### Historial Clínico
- Registros médicos completos (motivo de consulta, antecedentes, evaluación, plan)
- Gestión de alergias y medicamentos
- Historial por paciente con múltiples registros
- Exportación a PDF

### Plantillas Clínicas
- Creación y gestión de plantillas reutilizables
- Plantillas personalizadas por médico
- Uso rápido en consultas

### Generación de PDFs
- Exportación de historiales clínicos
- Exportación de consultas completas
- Formato profesional para archivo

### Sistema de Reservas
- Reserva pública de citas sin autenticación
- Selección de médico y especialidad
- Integración con sistema de pagos

## Documentación

- **[Descripción del Sistema](docs/SYSTEM_OVERVIEW.md)** - Documentación completa del sistema
- **[Guía de Autenticación](docs/AUTHENTICATION.md)** - Flujo de autenticación de profesionales médicos
- **[Guía de Mantenimiento](docs/MAINTENANCE.md)** - Backups, rotación de claves, actualizaciones
- **[Cumplimiento RGPD](docs/LEGAL_RGPD.md)** - Resumen técnico RGPD
- **[Arquitectura Separada](docs/ARCHITECTURE_SEPARATION.md)** - Separación landing page y aplicación
- **[Integración](docs/INTEGRATION.md)** - Guía de integración de componentes

## Configuración

### Variables de Entorno (.env)

```bash
# Base de datos
POSTGRES_USER=telemed_user
POSTGRES_PASSWORD=<generado>
POSTGRES_DB=telemed_db

# Seguridad Backend
SECRET_KEY=<generado>
ENCRYPTION_KEY=<generado>

# Integración Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Integración SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Configuración Jitsi
JITSI_DOMAIN=meet.yourdomain.com

# Usuario IT Admin (opcional, se crea automáticamente)
IT_ADMIN_EMAIL=it@yourdomain.com
IT_ADMIN_PASSWORD=password_segura
IT_ADMIN_FULL_NAME=IT Administrator

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
NEXT_PUBLIC_JITSI_DOMAIN=meet.yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Desarrollo

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Backup y Recuperación

### Crear Backup
```bash
make backup
```

### Restaurar Backup
```bash
openssl enc -d -aes-256-cbc -in backups/db_backup_*.sql.gz.enc \
  -pass pass:YOUR_SECRET_KEY | gunzip > restore.sql

docker exec -i telemed_db psql -U telemed_user telemed_db < restore.sql
```

## Solución de Problemas

### Backend no inicia
```bash
docker logs telemed_backend
```

### Problemas de conexión a base de datos
```bash
docker exec telemed_db pg_isready
```

### Frontend build falla
```bash
docker-compose -f infra/docker-compose.yml up --build frontend
```

### Stripe webhook no funciona
```bash
# Verificar webhook secret en .env
grep STRIPE_WEBHOOK_SECRET .env

# Probar webhook localmente
stripe listen --forward-to localhost:8080/api/v1/payments/webhook
```

### Emails no se envían
```bash
# Verificar API key de SendGrid
grep SENDGRID_API_KEY .env

# Probar servicio de email
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Licencia

MIT License - Ver archivo LICENSE para detalles

## Soporte

Para problemas y preguntas:
- **Email**: soporte@yourdomain.com
- **Documentación**: [docs/](docs/)

---

**Construido con ❤️ para profesionales de la salud**

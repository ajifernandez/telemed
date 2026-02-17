# Sistema Completo de Videoconsulta Médica

## Overview

Plataforma integral de telemedicina con autenticación segura, procesamiento de pagos, y videoconsultas en tiempo real.

## 🏗️ Arquitectura del Sistema

### Frontend (Next.js 14 - App Router)
- **Landing Page**: Página principal en `/`
- **Login Unificado**: `/login` - Redirige según rol del usuario
- **Reserva de Citas**: `/reserva` y `/booking` - Sistema público de reservas
- **Panel IT**: `/it/medical-professionals` - Gestión de profesionales médicos
- **Panel Admin**: `/admin` - Gestión de pacientes y consultas
  - `/admin/patients` - Listado de pacientes
  - `/admin/consultations` - Gestión de consultas
- **Panel Doctor**: `/doctor` - Dashboard médico completo
  - `/doctor/patients` - Gestión de pacientes del doctor
  - `/doctor/patients/[id]` - Detalle de paciente con historial
  - `/doctor/consultations` - Consultas del doctor
  - `/doctor/consultations/[id]` - Detalle de consulta
  - `/doctor/agenda` - Agenda médica
  - `/doctor/templates` - Plantillas clínicas
  - `/doctor/payments` - Pagos recibidos
  - `/doctor/new-consultation` - Crear nueva consulta
- **Video Room**: `/video-room` - Sala de videoconsulta Jitsi

### Backend (FastAPI)
- **API REST**: Endpoints organizados por módulos
- **Base de Datos**: PostgreSQL con encriptación AES-256
- **Webhooks**: Stripe para procesamiento de pagos
- **Generación de PDFs**: Exportación de historiales y consultas

### Infraestructura
- **Docker Compose**: Contenerización completa
- **Nginx**: Reverse proxy con SSL
- **Jitsi Meet**: Videoconferencia auto-hospedada (opcional)

## 🔐 Sistema de Autenticación

### Flujo Completo
1. **Registro Privado**: Admin registra médico con token
2. **Email Temporal**: Contraseña de un solo uso (24h)
3. **Primer Login**: Obliga cambio de contraseña
4. **Acceso Normal**: Login con email/contraseña
5. **Reset Contraseña**: Flujo seguro por email

### Endpoints de Autenticación
```
POST /api/v1/auth/register-medical-professional  # Registro privado (requiere token)
POST /api/v1/auth/login-temporary              # Primer login con contraseña temporal
POST /api/v1/auth/login                         # Login normal (redirige según rol)
POST /api/v1/auth/change-password               # Cambiar contraseña
POST /api/v1/auth/reset-password                # Solicitar reset
POST /api/v1/auth/reset-password-confirm        # Confirmar reset
GET  /api/v1/auth/me                           # Info usuario actual
```

### Roles y Redirección
El sistema soporta múltiples roles con dashboards específicos:
- **IT Admin** (`it_admin`): Redirige a `/it/medical-professionals`
- **Admin Médico** (`medical_admin`, `admin`): Redirige a `/admin`
- **Doctor** (`specialist`, `doctor`): Redirige a `/doctor`

## 💳 Sistema de Pagos (Stripe)

### Flujo de Pago
1. **Crear Consulta**: Paciente agenda y paga
2. **Checkout Session**: Stripe genera sesión de pago
3. **Webhook**: Confirma pago y envía emails
4. **Confirmación**: Consulta queda confirmada

### Endpoints de Pagos
```
POST /api/v1/payments/checkout-session          # Crear sesión Stripe
POST /api/v1/payments/webhook                  # Webhook Stripe
GET  /api/v1/payments/doctor/payments          # Pagos del doctor
GET  /api/v1/payments/consultations            # Listar consultas con pagos
POST /api/v1/payments/consultations            # Crear consulta
PUT  /api/v1/payments/consultations/{id}       # Actualizar consulta
```

### Eventos del Webhook
- `checkout.session.completed`: Pago exitoso
- `payment_intent.succeeded`: Pago confirmado
- `payment_intent.payment_failed`: Pago fallido

## 📹 Sistema de Videoconsultas (Jitsi)

### Flujo de Video
1. **Iniciar Consulta**: Médico genera sala Jitsi
2. **Room Único**: Nombre seguro por consulta
3. **Acceso Seguro**: Solo doctor y paciente autorizados
4. **Finalizar**: Registro de timestamps

### Endpoints de Video
```
POST /api/v1/video/consultations/{id}/start-video  # Iniciar video (genera sala Jitsi)
POST /api/v1/video/consultations/{id}/end-video    # Finalizar video (registra timestamps)
GET  /api/v1/video/consultations/{id}/video-info   # Info sala Jitsi
```

### Endpoints de Consultas
```
GET  /api/v1/consultations/public/doctors       # Listar doctores públicos
POST /api/v1/consultations/public/book         # Reserva pública de cita
POST /api/v1/consultations                     # Crear consulta (staff)
GET  /api/v1/consultations/me                  # Mis consultas (paciente)
```

### Endpoints de Doctor
```
GET  /api/v1/doctor/patients                   # Listar pacientes del doctor
GET  /api/v1/doctor/patients/{id}/history     # Historial clínico del paciente
POST /api/v1/doctor/patients/{id}/history     # Crear registro clínico
PUT  /api/v1/doctor/patients/{id}/history/{id} # Actualizar registro clínico
DELETE /api/v1/doctor/patients/{id}/history/{id} # Eliminar registro clínico
GET  /api/v1/doctor/consultations              # Consultas del doctor
```

### Endpoints de Admin
```
GET  /api/v1/admin/medical-professionals       # Listar profesionales médicos
PATCH /api/v1/admin/medical-professionals/{id} # Actualizar profesional
GET  /api/v1/admin/patients                    # Listar todos los pacientes
GET  /api/v1/admin/consultations               # Listar todas las consultas
PATCH /api/v1/admin/consultations/{id}         # Actualizar consulta
```

### Endpoints de Plantillas Clínicas
```
GET    /api/v1/templates                      # Listar plantillas
POST   /api/v1/templates                      # Crear plantilla
GET    /api/v1/templates/{id}                 # Obtener plantilla
PUT    /api/v1/templates/{id}                 # Actualizar plantilla
DELETE /api/v1/templates/{id}                 # Eliminar plantilla
```

### Endpoints de PDFs
```
GET /api/v1/pdf/patients/{id}/history/pdf                    # PDF historial completo
GET /api/v1/pdf/consultations/{id}/pdf                       # PDF consulta
GET /api/v1/pdf_clinica/patients/{id}/complaint/{id}/pdf     # PDF motivo específico
GET /api/v1/pdf_clinica/patients/{id}/history/pdf            # PDF historial alternativo
GET /api/v1/pdf_clinica/consultations/{id}/pdf                # PDF consulta alternativo
```

### Configuración Jitsi
- **Dominio**: `JITSI_DOMAIN` (ej: meet.yourdomain.com)
- **Rooms**: `Telemed_{id}_{random}`
- **Integración**: Frontend con Jitsi External API

## 📧 Sistema de Emails (SendGrid)

### Tipos de Emails
- **Contraseña Temporal**: Registro de médico
- **Confirmación Consulta**: Pago exitoso
- **Notificación Médico**: Nueva consulta agendada
- **Reset Contraseña**: Recuperación de cuenta

### Configuración
```bash
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## 🗄️ Base de Datos

### Tablas Principales
```sql
users              # Usuarios del sistema (médicos, admins, IT)
  - id, email, hashed_password
  - is_active, is_superuser, is_medical_professional
  - role (it_admin, medical_admin, admin, specialist)
  - full_name, license_number, specialty
  - temporary_password, password_reset_token

patients           # Pacientes (datos encriptados)
  - id, full_name (encrypted), email (encrypted), phone (encrypted)
  - created_at

consultations      # Citas médicas
  - id, patient_id, doctor_id
  - consultation_type, specialty, reason_for_visit, notes
  - scheduled_at, duration_minutes, status
  - jitsi_room_name, jitsi_room_url
  - started_at, ended_at

payments           # Pagos Stripe
  - id, consultation_id
  - amount, currency, status
  - stripe_payment_intent_id, stripe_session_id, stripe_customer_id
  - refund_amount, stripe_refund_id

clinical_records    # Historial clínico
  - id, patient_id
  - chief_complaint, background, assessment, plan
  - allergies, medications
  - created_at

clinical_templates  # Plantillas clínicas
  - id, name, description
  - chief_complaint, background, assessment, plan
  - allergies, medications
  - created_by_id, created_at
```

### Encriptación
- **Datos Pacientes**: AES-256 (Fernet)
- **Contraseñas**: bcrypt
- **Tokens**: JWT con expiración

## 🚀 Despliegue

### Comandos Make
```bash
make setup    # Generar .env y claves
make deploy   # Iniciar todos los servicios
make down     # Detener servicios
make logs     # Ver logs
make backup   # Backup encriptado
```

### Variables de Entorno
```bash
# Base de Datos
POSTGRES_USER=telemed_user
POSTGRES_PASSWORD=generated
POSTGRES_DB=telemed_db

# Seguridad
SECRET_KEY=generated
ENCRYPTION_KEY=generated

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@domain.com

# Jitsi
JITSI_DOMAIN=meet.yourdomain.com
```

## 🔄 Flujo Completo del Usuario

### 1. Registro de Médico
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-medical-professional \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "full_name": "Dr. Juan Pérez",
    "license_number": "MED-12345",
    "specialty": "Cardiología",
    "registration_token": "token-seguro"
  }'
```

### 2. Paciente Agenda Consulta
```bash
curl -X POST http://localhost:8080/api/v1/payments/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "patient_id": 1,
    "doctor_id": 1,
    "specialty": "Cardiología",
    "scheduled_at": "2026-02-10T10:00:00Z"
  }'
```

### 3. Crear Sesión de Pago
```bash
curl -X POST http://localhost:8080/api/v1/payments/checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "consultation_id": 1,
    "success_url": "https://yourdomain.com/success",
    "cancel_url": "https://yourdomain.com/cancel"
  }'
```

### 4. Iniciar Videoconsulta
```bash
curl -X POST http://localhost:8080/api/v1/video/consultations/1/start-video \
  -H "Authorization: Bearer TOKEN_DOCTOR"
```

## 📊 Monitorización y Mantenimiento

### Logs
```bash
make logs  # Todos los servicios
docker logs telemed_backend  # Solo backend
docker logs telemed_frontend  # Solo frontend
```

### Backups
```bash
make backup  # Backup encriptado
# Restaurar:
openssl enc -d -aes-256-cbc -in backups/db_backup_*.sql.gz.enc \
  -pass pass:SECRET_KEY | gunzip > restore.sql
```

### Health Checks
```bash
curl http://localhost:8080/api/health  # Backend health
curl http://localhost:8080/app          # Frontend health
```

## 🔧 Configuración Avanzada

### Jitsi Self-Hosted
```bash
# Instalar Jitsi Meet Docker
git clone https://github.com/jitsi/docker-jitsi-meet
cd docker-jitsi-meet
cp env.example .env
# Configurar .env con tu dominio
./gen-passwords.sh
docker-compose up -d
```

**Repository**: https://github.com/jitsi/docker-jitsi-meet
**Guide**: See [Jitsi Integration Guide](docs/JITSI_INTEGRATION.md)

### SSL con Let's Encrypt
```bash
# En producción
certbot --nginx -d yourdomain.com -d app.yourdomain.com
```

### Rate Limiting
```nginx
# En nginx/conf.d/default.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend:8000;
}
```

## 🛡️ Consideraciones de Seguridad

### RGPD Cumplimiento
- **Datos Encriptados**: Nombre, email, teléfono pacientes
- **Audit Trail**: Todos los accesos registrados
- **Retención**: Política de borrado automática

### Seguridad de Red
- **HTTPS/TLS**: Todo el tráfico encriptado
- **Webhooks**: Verificación de firma Stripe
- **JWT**: Tokens con expiración corta

### Best Practices
- **Environment Variables**: Secrets fuera del código
- **Docker**: Contenedores no root
- **PostgreSQL**: Usuario dedicado con permisos mínimos

## 📋 Funcionalidades Adicionales

### Historial Clínico
- Registros médicos completos por paciente
- Campos: motivo de consulta, antecedentes, evaluación, plan de tratamiento
- Gestión de alergias y medicamentos
- Múltiples registros por paciente con timestamps
- Exportación a PDF profesional

### Plantillas Clínicas
- Creación de plantillas reutilizables
- Plantillas personalizadas por médico
- Uso rápido en nuevas consultas
- Gestión completa (CRUD) de plantillas

### Generación de PDFs
- Exportación de historiales clínicos completos
- Exportación de consultas con toda la información
- Formato profesional para archivo médico
- Múltiples formatos disponibles

### Sistema de Reservas Públicas
- Reserva de citas sin necesidad de cuenta
- Selección de médico y especialidad
- Integración directa con sistema de pagos
- Confirmación por email automática

## 📈 Escalabilidad

### Horizontal Scaling
```yaml
# docker-compose.prod.yml
services:
  backend:
    replicas: 3
  frontend:
    replicas: 2
  nginx:
    # Load balancing configuration
```

### Database Scaling
- **Read Replicas**: Para consultas de lectura
- **Connection Pooling**: PgBouncer
- **Backups**: Incrementales diarios

## 🚨 Troubleshooting

### Issues Comunes
1. **Backend no inicia**: Verificar variables de entorno
2. **Pago fallido**: Revisar webhook secret
3. **Video no funciona**: Configurar dominio Jitsi
4. **Email no llega**: Verificar API key SendGrid

### Debug Commands
```bash
# Verificar conexión DB
docker exec -it telemed_db psql -U telemed_user telemed_db

# Verificar variables de entorno
docker exec telemed_backend env | grep -E "(STRIPE|SENDGRID|JITSI)"

# Test webhook Stripe
stripe listen --forward-to localhost:8080/api/v1/payments/webhook
```

## 📝 Próximos Features

- **Scheduling Avanzado**: Calendario con disponibilidad y bloqueos
- **File Sharing**: Documentos médicos seguros
- **Prescriptions**: Recetas electrónicas
- **Multi-language**: Soporte multiidioma
- **Notificaciones Push**: Alertas en tiempo real
- **Analytics**: Dashboard de métricas y estadísticas

---

**Estado Actual**: ✅ Sistema funcional y listo para producción

**Componentes Activos**:
- ✅ Sistema multi-rol (IT, Admin, Doctor)
- ✅ Autenticación completa con contraseñas temporales
- ✅ Procesamiento de pagos Stripe
- ✅ Videoconsultas Jitsi
- ✅ Historial clínico completo
- ✅ Plantillas clínicas personalizables
- ✅ Generación de PDFs
- ✅ Reservas públicas de citas
- ✅ Emails transaccionales
- ✅ Base de datos segura con cifrado AES-256
- ✅ Despliegue Docker completo

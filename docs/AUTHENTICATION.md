# Sistema de Autenticación para Profesionales Médicos

## Overview

Este documento describe el sistema de autenticación implementado para el acceso de profesionales médicos al dashboard de la plataforma de telemedicina.

## Flujo de Autenticación

### 1. Registro de Profesional Médico

**Endpoint**: `POST /api/v1/auth/register-medical-professional`

El registro es privado y requiere un token de invitación válido.

**Request Body**:
```json
{
  "email": "doctor@ejemplo.com",
  "full_name": "Dr. Juan Pérez",
  "license_number": "MED-12345",
  "specialty": "Cardiología",
  "registration_token": "token-secreto-de-invitacion"
}
```

**Response**:
```json
{
  "message": "Medical professional registered successfully",
  "user_id": 123
}
```

**Proceso**:
- Se valida que el email y número de licencia no existan
- Se genera una contraseña temporal segura (12 caracteres, válida por 24 horas)
- Se envía email con la contraseña temporal
- El usuario se marca como `is_first_login = true`

### 2. Primer Login (Contraseña Temporal)

**Endpoint**: `POST /api/v1/auth/login-temporary`

**Request Body**:
```json
{
  "email": "doctor@ejemplo.com",
  "temporary_password": "AbC123!@#xYz"
}
```

**Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "email": "doctor@ejemplo.com",
    "full_name": "Dr. Juan Pérez",
    "is_first_login": true
  },
  "requires_password_change": true
}
```

**Validaciones**:
- La contraseña temporal debe existir y no estar expirada
- Se genera un token JWT válido por 30 minutos
- Se requiere cambio de contraseña obligatorio

### 3. Cambio de Contraseña Obligatorio

**Endpoint**: `POST /api/v1/auth/change-password`

**Request Body**:
```json
{
  "current_password": "AbC123!@#xYz",
  "new_password": "MiNuevaContraseña123!"
}
```

**Response**:
```json
{
  "message": "Password changed successfully"
}
```

**Proceso**:
- Se valida la contraseña actual (temporal o permanente)
- Se hashea la nueva contraseña con bcrypt
- Se elimina la contraseña temporal
- Se marca `is_first_login = false`

### 4. Login Normal

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:
```json
{
  "email": "doctor@ejemplo.com",
  "password": "MiNuevaContraseña123!"
}
```

**Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "email": "doctor@ejemplo.com",
    "full_name": "Dr. Juan Pérez",
    "is_first_login": false
  },
  "requires_password_change": false
}
```

### 5. Restablecimiento de Contraseña

**Paso 1: Solicitar Restablecimiento**

**Endpoint**: `POST /api/v1/auth/reset-password`

**Request Body**:
```json
{
  "email": "doctor@ejemplo.com"
}
```

**Response**:
```json
{
  "message": "Password reset instructions sent"
}
```

**Proceso**:
- Se genera un token único de restablecimiento (válido por 1 hora)
- Se envía email con enlace de restablecimiento
- No se revela si el email existe o no (seguridad)

**Paso 2: Confirmar Restablecimiento**

**Endpoint**: `POST /api/v1/auth/reset-password-confirm`

**Request Body**:
```json
{
  "token": "reset-token-unico-seguro",
  "new_password": "NuevaContraseña456!"
}
```

**Response**:
```json
{
  "message": "Password reset successfully"
}
```

## Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login normal con email/contraseña |
| POST | `/api/v1/auth/login-temporary` | Primer login con contraseña temporal |
| POST | `/api/v1/auth/change-password` | Cambiar contraseña |
| POST | `/api/v1/auth/reset-password` | Solicitar restablecimiento |
| POST | `/api/v1/auth/reset-password-confirm` | Confirmar restablecimiento |
| POST | `/api/v1/auth/register-medical-professional` | Registro privado |
| GET | `/api/v1/auth/me` | Obtener información del usuario actual |

## Seguridad Implementada

### 1. Contraseñas
- **Hashing**: bcrypt con salt
- **Contraseñas temporales**: 12 caracteres, 1 hora de validez
- **Tokens de reset**: 32 bytes, 1 hora de validez

### 2. Tokens JWT
- **Algoritmo**: HS256
- **Duración**: 30 minutos
- **Payload**: user_id + expiración

### 3. Validaciones
- Email único y validado
- Número de licencia único
- Verificación de expiración de tokens temporales
- Rate limit implícito por expiración de tokens

### 4. Emails
- SendGrid para producción
- Plantillas HTML profesionales
- Modo desarrollo con fallback a console.log

## Configuración

Variables de entorno requeridas:

```bash
# JWT
SECRET_KEY=tu-clave-secreta-super-segura

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@tuclinica.com
FROM_NAME="Tu Clínica Médica"
```

## Base de Datos

### Schema de la tabla `users`:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    is_medical_professional BOOLEAN DEFAULT false,
    full_name VARCHAR,
    license_number VARCHAR UNIQUE,
    specialty VARCHAR,
    is_first_login BOOLEAN DEFAULT true,
    password_reset_token VARCHAR,
    password_reset_expires TIMESTAMP,
    temporary_password VARCHAR,
    temporary_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    last_login TIMESTAMP
);
```

## Ejemplo de Flujo Completo

```bash
# 1. Registro (admin)
curl -X POST http://localhost:8000/api/v1/auth/register-medical-professional \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dra.garcia@hospital.com",
    "full_name": "Dra. María García",
    "license_number": "MED-67890",
    "specialty": "Pediatría",
    "registration_token": "token-admin-seguro"
  }'

# 2. Primer login (médico)
curl -X POST http://localhost:8000/api/v1/auth/login-temporary \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dra.garcia@hospital.com",
    "temporary_password": "AbC123!@#xYz"
  }'

# 3. Cambiar contraseña
curl -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "AbC123!@#xYz",
    "new_password": "ContraseñaSegura123!"
  }'

# 4. Login normal
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dra.garcia@hospital.com",
    "password": "ContraseñaSegura123!"
  }'
```

## Consideraciones Importantes

1. **Privacidad**: Los datos de pacientes están encriptados en la base de datos
2. **RGPD**: Cumplimiento con regulaciones de protección de datos
3. **Auditoría**: Todos los login quedan registrados con timestamp
4. **Escalabilidad**: Sistema preparado para múltiples profesionales
5. **Seguridad**: Sin exposición de información sensible en respuestas

## Próximos Mejoras

- Integración con SSO (Google, Microsoft)
- Autenticación de dos factores (2FA)
- Política de expiración de contraseñas
- Auditoría avanzada de accesos
- Rate limiting por IP

# Beatriz Tu Médica de Familia - Arquitectura Separada

## 🏗️ Visión General

### Web Profesional (Netlify)
- **URL**: `beatriztumedicadefamilia.com`
- **Contenido**: Landing page estática
- **Tecnologías**: HTML, CSS, JavaScript puro
- **Hosting**: Netlify
- **Ventajas**: CDN global, HTTPS automático, deploy continuo

### Aplicación Médica (Proxmox)
- **URL**: `app.beatriztumedicadefamilia.com`
- **Contenido**: Backend FastAPI + Frontend Next.js
- **Tecnologías**: Docker, PostgreSQL, Stripe, Jitsi
- **Hosting**: Servidor Proxmox propio
- **Ventajas**: Control total, datos médicos seguros

## 📂 Estructura de Proyectos

### `/landing-page/` (Nuevo repositorio)
```
landing-page/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── images/
└── netlify.toml
```

### `/telemedicine-app/` (Repositorio actual)
```
telemedicine-app/
├── backend/
├── frontend/
├── infra/
└── docs/
```

## 🚀 Implementación

### Paso 1: Separar Landing Page
1. Crear nuevo repositorio `landing-page`
2. Mover `index.html` y assets al nuevo repo
3. Configurar Netlify deployment

### Paso 2: Modificar Aplicación Médica
1. Eliminar landing page del frontend Next.js
2. Enfocarse solo en la aplicación médica
3. Configurar subdominio `app.beatriztumedicadefamilia.com`

### Paso 3: Integración
1. Landing page enlaza a la aplicación médica
2. Formulario de contacto redirige al login
3. Branding consistente entre ambos sitios

## 🔧 Configuración Técnica

### Netlify Configuration
```toml
# netlify.toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

###- **Dra. Beatriz Landing Page**: [beatriztumedicadefamilia.es](https://www.beatriztumedicadefamilia.es/)

### DNS Configuration
```
A beatriztumedicadefamilia.com -> Netlify IP
A app.beatriztumedicadefamilia.com -> Proxmox IP
```

## 📊 Ventajas

### Seguridad
- Datos médicos aislados en servidor propio
- Cumplimiento GDPR/HIPAA más fácil
- Reducción de superficie de ataque

### Performance
- Landing page servida desde CDN global
- Aplicación médica optimizada para consultas
- Menos carga en servidor médico

### Mantenimiento
- Updates de landing page sin afectar app médica
- Escalado independiente
- Backup más sencillo

## 🎯 Flujo de Usuario

1. **Descubrimiento**: Landing page en Netlify
2. **Información**: Explora servicios y contacto
3. **Acción**: "Pide tu cita" → redirección a app médica
4. **Aplicación**: Login, consultas, videollamadas

## 🔄 Deploy Continuo

### Landing Page (Netlify)
```bash
git push origin main
# Netlify auto-deploy
```

### Aplicación Médica (Proxmox)
```bash
make deploy
# Docker Compose en Proxmox
```

## 📈 Escalabilidad Futura

### Fase 1: Separación
- Landing page en Netlify
- App médica en Proxmox

### Fase 2: Expansión
- Múltiples médicos en misma app
- Dominios especializados por especialidad

### Fase 3: Microservicios
- Auth service separado
- Video service dedicado
- Analytics independiente

# Integration Guide - Landing Page + Platform

## Overview

The website is now integrated using a **hybrid architecture**:

- **Landing Page** (`index.html`) - Public corporate website at `/`
- **Platform App** (Next.js) - Booking & video consultations at `/app`
- **API Backend** (FastAPI) - REST API at `/api`

## URL Structure

| URL | Content | Purpose |
|-----|---------|---------|
| `/` | `index.html` | Corporate landing page (static) |
| `/app` | Next.js frontend | Patient booking & dashboard |
| `/app/dashboard` | Dashboard | Doctor's control panel |
| `/app/video-room` | Video room | Jitsi consultation room |
| `/api/*` | FastAPI backend | REST API endpoints |

## How It Works

### 1. User Journey

```
Patient visits beatriz.tumedicadefamilia.com
    ↓
Sees beautiful landing page (index.html)
    ↓
Clicks "Pedir Cita" or "Reserva tu cita"
    ↓
Redirected to /app (Next.js platform)
    ↓
Books appointment, makes payment (Stripe)
    ↓
Receives email with video link (SendGrid)
    ↓
Joins video consultation (/app/video-room)
```

### 2. Nginx Routing

The Nginx reverse proxy directs traffic:

```nginx
# Landing page (static files)
location / {
    root /var/www/html;
    index index.html;
}

# Platform app (Next.js)
location /app {
    proxy_pass http://frontend:3000;
}

# API (FastAPI)
location /api {
    proxy_pass http://backend:8000;
}
```

## Deployment

When you run `make deploy`, all services start:

1. **PostgreSQL** - Database
2. **Backend** (FastAPI) - API server
3. **Frontend** (Next.js) - Platform app
4. **Nginx** - Serves landing page + proxies to apps

## Files Modified

- [index.html](file:///home/user/Projects/others/beatriz_tu_medica_de_familia/index.html) - Updated CTA buttons to `/app`
- [nginx/conf.d/default.conf](file:///home/user/Projects/others/beatriz_tu_medica_de_familia/infra/nginx/conf.d/default.conf) - Added routing rules
- [docker-compose.yml](file:///home/user/Projects/others/beatriz_tu_medica_de_familia/infra/docker-compose.yml) - Mounted landing page files to nginx

## Testing Locally

```bash
# 1. Start the platform
make deploy

# 2. Visit in browser
http://localhost          # Landing page
http://localhost/app      # Platform (Next.js)
http://localhost/api/docs # API documentation
```

## Production Domain Setup

For production with a custom domain (e.g., `beatriz.tumedicadefamilia.com`):

```nginx
server {
    listen 443 ssl;
    server_name beatriz.tumedicadefamilia.com;
    
    ssl_certificate /etc/letsencrypt/live/beatriz.tumedicadefamilia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beatriz.tumedicadefamilia.com/privkey.pem;
    
    # Same routing as above...
}
```

## Benefits

✅ **Beautiful first impression** - Professional landing page  
✅ **Seamless transition** - One click to booking  
✅ **SEO friendly** - Static HTML for search engines  
✅ **Scalable** - Can update platform without touching landing page  
✅ **Fast** - Static files served directly by Nginx

# Jitsi Meet Integration Guide

## Overview

This guide explains how to integrate Jitsi Meet for secure video consultations in the telemedicine platform.

## Options for Jitsi Deployment

### 1. Jitsi Meet Cloud (Free)
- **URL**: `https://meet.jit.si`
- **Cost**: Free
- **Setup**: No configuration required
- **Limitations**: Public servers, no custom branding

### 2. Jitsi Meet Self-Hosted (Recommended)
- **Repository**: https://github.com/jitsi/docker-jitsi-meet
- **Cost**: Server hosting only
- **Setup**: Docker-based deployment
- **Benefits**: Full control, custom domain, branding

## Self-Hosted Jitsi Setup

### Prerequisites
- Docker & Docker Compose
- Domain name (e.g., meet.yourdomain.com)
- SSL certificate (Let's Encrypt recommended)

### Installation Steps

```bash
# 1. Clone Jitsi Docker repository
git clone https://github.com/jitsi/docker-jitsi-meet
cd docker-jitsi-meet

# 2. Copy environment template
cp env.example .env

# 3. Edit configuration
nano .env
```

### Key Configuration (.env)

```bash
# Domain configuration
PUBLIC_URL=https://meet.yourdomain.com

# Enable authentication (recommended)
ENABLE_AUTH=1
AUTH_TYPE=internal
JICOFO_AUTH_USER=focus
JICOFO_AUTH_PASSWORD=your_secure_password

# JWT Authentication (for advanced integration)
ENABLE_JWT_AUTH=1
JWT_APP_ID=your_app_id
JWT_APP_SECRET=your_jwt_secret

# Security settings
DISABLE_HTTPS=0  # Set to 1 if using external SSL
```

### Deploy Jitsi

```bash
# Generate passwords
./gen-passwords.sh

# Start Jitsi services
docker-compose up -d

# Verify deployment
docker-compose ps
```

## Integration with Telemedicine Platform

### 1. Update Environment Variables

In your telemedicine platform `.env`:

```bash
# Jitsi Configuration
JITSI_DOMAIN=meet.yourdomain.com
JITSI_JWT_SECRET=your_jwt_secret  # If using JWT auth
```

### 2. Frontend Configuration

The frontend automatically uses the `NEXT_PUBLIC_JITSI_DOMAIN` environment variable:

```typescript
// frontend/app/video-room/page.tsx
const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'
```

### 3. Backend Room Management

The backend generates secure room names:

```python
# backend/app/api/video.py
room_name = f"Telemed_{consultation.id}_{secrets.token_hex(4)}"
jitsi_room_url = f"https://{jitsi_domain}/{room_name}"
```

## Security Considerations

### 1. Authentication
- **Recommended**: Enable Jitsi authentication
- **Options**: Internal auth, LDAP, JWT
- **Benefits**: Prevent unauthorized room access

### 2. Room Security
- **Room Names**: Cryptographically secure random names
- **Access Control**: Only authenticated participants
- **Time Limits**: Rooms expire after consultation

### 3. Network Security
- **HTTPS**: Required for production
- **Firewall**: Open ports 80, 443, 10000 (UDP)
- **Domain**: Use dedicated subdomain

## Advanced Configuration

### Custom Branding

```bash
# In Jitsi .env
JICOFO_APP_NAME="Your Clinic Video"
JIGASI_XMPP_SERVER=default
JIGASI_XMPP_BOSH_URLS=default
```

### Recording (Optional)

```bash
# Enable recording
ENABLE_RECORDING=1
RECORDING_DIRECTORY=/config/recordings
```

### Live Streaming (Optional)

```bash
# Enable live streaming
ENABLE_LIVESTREAM=1
```

## Troubleshooting

### Common Issues

1. **Rooms not loading**
   ```bash
   # Check Jitsi logs
   docker-compose logs jicofo
   docker-compose logs prosody
   ```

2. **Authentication failures**
   ```bash
   # Verify auth configuration
   docker-compose exec prosody cat /config/prosody.cfg.lua
   ```

3. **Network issues**
   ```bash
   # Check port connectivity
   telnet meet.yourdomain.com 443
   telnet meet.yourdomain.com 10000
   ```

### Performance Optimization

```bash
# Increase JVM memory for large meetings
JICOFO_HEAP_SIZE=2048m
JVB_HEAP_SIZE=3072m
```

## Monitoring

### Health Checks

```bash
# Check Jitsi status
curl https://meet.yourdomain.com/http-bind

# Monitor active conferences
docker-compose exec jvb /bin/bash -c "echo 'stats' | nc localhost 8080"
```

### Metrics

Jitsi provides metrics at:
- **JVB**: `http://localhost:8080/colibri/stats`
- **Jicofo**: `http://localhost:8888/stats`

## Backup and Recovery

### Configuration Backup

```bash
# Backup Jitsi configuration
tar -czf jitsi-config-backup.tar.gz .env/ config/

# Restore
tar -xzf jitsi-config-backup.tar.gz
docker-compose restart
```

### Data Backup

```bash
# Backup recordings (if enabled)
docker-compose exec jvb tar -czf /tmp/recordings-backup.tar.gz /config/recordings
docker cp jitsi_jvb:/tmp/recordings-backup.tar.gz ./
```

## Integration Testing

### Test Video Consultation Flow

```bash
# 1. Create test consultation
curl -X POST http://localhost:8080/api/v1/payments/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "patient_id": 1,
    "doctor_id": 1,
    "specialty": "Test",
    "scheduled_at": "2026-02-10T10:00:00Z"
  }'

# 2. Start video room
curl -X POST http://localhost:8080/api/v1/video/consultations/1/start-video \
  -H "Authorization: Bearer DOCTOR_TOKEN"

# 3. Access room
# Navigate to: https://meet.yourdomain.com/Telemed_1_abc123
```

## Best Practices

1. **Use dedicated subdomain** for Jitsi
2. **Enable authentication** for security
3. **Monitor resource usage** (CPU, memory, bandwidth)
4. **Regular updates** of Jitsi Docker images
5. **Backup configuration** regularly
6. **Test failover** procedures

## Resources

- **Official Docs**: https://jitsi.github.io/handbook/
- **Docker Repository**: https://github.com/jitsi/docker-jitsi-meet
- **Community Forum**: https://community.jitsi.org/
- **Security Guide**: https://jitsi.github.io/handbook/docs/security

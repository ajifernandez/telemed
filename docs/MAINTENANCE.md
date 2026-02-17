# Maintenance Guide - Telemedicine Platform

## Overview
This document provides step-by-step procedures for maintaining the Telemedicine Platform in production.

## Database Backups

### Automated Daily Backups
Backups are created using the Makefile command:

```bash
make backup
```

This creates an encrypted backup in the `backups/` directory with the format:
```
db_backup_YYYY-MM-DD_HH-MM-SS.sql.gz.enc
```

### Restoring from Backup
To restore a backup:

```bash
# Decrypt and decompress
openssl enc -d -aes-256-cbc -in backups/db_backup_2024-01-15_10-30-00.sql.gz.enc -pass pass:YOUR_SECRET_KEY | gunzip > restore.sql

# Stop the platform
make down

# Restore to database
docker exec -i telemed_db psql -U telemed_user telemed_db < restore.sql

# Restart
make deploy
```

## Key Rotation

### Rotating Stripe API Keys
1. Log into Stripe Dashboard
2. Generate new API keys
3. Update `.env` file:
   ```bash
   STRIPE_SECRET_KEY=sk_live_NEW_KEY
   ```
4. Restart backend:
   ```bash
   docker-compose -f infra/docker-compose.yml restart backend
   ```

### Rotating SendGrid API Keys
1. Log into SendGrid
2. Create new API key with same permissions
3. Update `.env`:
   ```bash
   SENDGRID_API_KEY=SG.NEW_KEY
   ```
4. Restart backend

### Rotating Encryption Key (CRITICAL)
> [!CAUTION]
> Rotating the encryption key requires re-encrypting all patient data. This is a high-risk operation.

**Procedure:**
1. Create a backup: `make backup`
2. Create a Python script to decrypt all PII with old key and re-encrypt with new key
3. Test thoroughly in staging environment first
4. Schedule maintenance window
5. Execute migration script
6. Update `.env` with new `ENCRYPTION_KEY`
7. Restart all services

## Updating Jitsi Meet

### Self-Hosted Jitsi (Docker)

```bash
# Navigate to Jitsi directory
cd docker-jitsi-meet

# Pull latest images
docker-compose pull

# Restart with new images (no downtime if done correctly)
docker-compose up -d

# Verify all containers are running
docker-compose ps
```

**Repository**: https://github.com/jitsi/docker-jitsi-meet

**Important:** Always backup your `.env` file before updating:
```bash
cp .env .env.backup
```

## Quarterly Integrity Checks

### Database Integrity
Run quarterly (every 3 months):

```bash
# Connect to database
docker exec -it telemed_db psql -U telemed_user telemed_db

# Check for orphaned records
SELECT COUNT(*) FROM patients WHERE created_at < NOW() - INTERVAL '2 years';

# Verify encryption (should return gibberish)
SELECT phone FROM patients LIMIT 1;
```

### Disk Space Monitoring
```bash
# Check Docker volumes
docker system df

# Clean up old images
docker system prune -a
```

### SSL Certificate Renewal
Certbot auto-renews certificates. Verify:

```bash
docker exec telemed_nginx certbot renew --dry-run
```

## Troubleshooting

### Backend Won't Start
1. Check logs: `docker logs telemed_backend`
2. Verify `.env` file exists and has all required keys
3. Check database connectivity: `docker exec telemed_db pg_isready`

### Frontend Build Fails
1. Clear Next.js cache: `rm -rf frontend/.next`
2. Rebuild: `docker-compose -f infra/docker-compose.yml up --build frontend`

### Database Connection Issues
1. Verify PostgreSQL is running: `docker ps | grep telemed_db`
2. Check connection string in `.env`
3. Restart database: `docker-compose -f infra/docker-compose.yml restart db`

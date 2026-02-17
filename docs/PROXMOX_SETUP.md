# Proxmox Deployment Guide

## Prerequisites
- Proxmox VE 7.0 or higher
- Static IP address for the VM
- Domain name pointing to your public IP
- Router with port forwarding capabilities

## VM Creation

### Recommended Specifications
- **OS**: Ubuntu Server 22.04 LTS
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 50 GB (SSD recommended)
- **Network**: Bridged adapter

### Creating the VM
1. Download Ubuntu Server 22.04 ISO
2. In Proxmox, click "Create VM"
3. Configure:
   - **General**: Name: `telemed-platform`, VM ID: 100
   - **OS**: Select Ubuntu ISO
   - **System**: Default (UEFI if available)
   - **Disks**: 50GB, SSD emulation enabled
   - **CPU**: 4 cores, Type: host
   - **Memory**: 8192 MB
   - **Network**: Bridge to vmbr0

4. Start VM and install Ubuntu Server
5. During installation, enable OpenSSH server

## Network Configuration

### Port Forwarding (Router)
Forward these ports from your router to the VM's local IP:

| Service | Protocol | External Port | Internal Port |
|---------|----------|---------------|---------------|
| HTTP    | TCP      | 80            | 80            |
| HTTPS   | TCP      | 443           | 443           |
| Jitsi Video | UDP | 10000         | 10000         |

### Firewall (UFW)
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 10000/udp # Jitsi
sudo ufw enable
```

### Static IP Configuration
Edit `/etc/netplan/00-installer-config.yaml`:

```yaml
network:
  version: 2
  ethernets:
    ens18:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Apply:
```bash
sudo netplan apply
```

## Software Installation

### Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Install Docker Compose
```bash
sudo apt update
sudo apt install docker-compose-plugin
```

### Install Jitsi Meet (Self-Hosted)

```bash
# Clone the official Jitsi Docker repository
git clone https://github.com/jitsi/docker-jitsi-meet
cd docker-jitsi-meet

# Copy environment template
cp env.example .env

# Generate passwords and secrets
./gen-passwords.sh

# Edit .env configuration
nano .env
```

**Required .env changes:**
```bash
# Set your domain
PUBLIC_URL=https://meet.yourdomain.com

# Set timezone
TZ=Europe/Madrid

# Enable authentication (optional, for private meetings)
ENABLE_AUTH=1
ENABLE_GUESTS=0

# JWT settings (if using authentication)
ENABLE_JWT=1
JWT_APP_ID=telemed
JWT_APP_SECRET=<your-secret>
```

**Start Jitsi:**
```bash
docker-compose up -d
```

### Clone Telemedicine Platform Repository
```bash
cd ..
git clone https://github.com/yourusername/telemed-platform.git
cd telemed-platform
```

## Deployment

### Initial Setup
```bash
# Generate secrets
make setup

# Edit .env with your actual API keys
nano .env

# Deploy
make deploy
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx volume
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infra/nginx/certbot/conf/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infra/nginx/certbot/conf/
```

Update `infra/nginx/conf.d/default.conf` to use SSL.

## Resource Optimization

### Proxmox VM Settings
- Enable **NUMA** for better memory performance
- Set **CPU type** to "host" for maximum performance
- Enable **Discard** on disk for SSD TRIM support

### Docker Resource Limits
Edit `infra/docker-compose.yml` to add resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Monitoring
Install Prometheus + Grafana for monitoring:

```bash
# Add monitoring stack to docker-compose.yml
# Or use Proxmox built-in monitoring
```

## Backup Strategy

### VM Snapshots (Proxmox)
1. In Proxmox UI, select VM
2. Go to "Snapshots"
3. Create snapshot before major updates

### Automated Backups
Set up cron job:

```bash
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/telemed-platform && make backup
```

## Troubleshooting

### VM Performance Issues
- Check CPU usage: `htop`
- Check disk I/O: `iotop`
- Increase VM resources if needed

### Network Connectivity
- Verify port forwarding: `sudo netstat -tulpn | grep LISTEN`
- Check firewall: `sudo ufw status`
- Test external access: `curl -I http://yourdomain.com`

### Docker Issues
- Check logs: `docker-compose -f infra/docker-compose.yml logs`
- Restart services: `make down && make deploy`

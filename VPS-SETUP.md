# VPS Deployment Guide (Option 3 - Docker)

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- 1GB RAM minimum (2GB recommended)
- 10GB disk space
- Root or sudo access

## Recommended VPS Providers

| Provider | Price | Link |
|----------|-------|------|
| DigitalOcean | $6/month | [digitalocean.com](https://m.do.co/c/your-referral) |
| Linode | $5/month | [linode.com](https://linode.com) |
| Vultr | $5/month | [vultr.com](https://vultr.com) |
| AWS Lightsail | $5/month | [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com) |

---

## Step-by-Step Deployment

### Step 1: Get a VPS

Sign up with any provider above and create an Ubuntu 22.04 server.

**Recommended specs:**
- 1 vCPU
- 1-2GB RAM
- 25GB SSD
- Ubuntu 22.04 LTS

### Step 2: Connect to Your VPS

```bash
ssh root@YOUR_SERVER_IP
```

### Step 3: Run the Deployment Script

```bash
# Download and run the deploy script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy-vps.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

Or manually:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone your repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git mcleave
cd mcleave

# Create data directory
mkdir -p data

# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
DB_PATH=/app/data/mcleave.db
EOF

# Build and run
docker-compose up -d --build
```

### Step 4: Migrate Your Database

From your local machine:

```bash
# Copy your local database to VPS
scp server/mcleave.db root@YOUR_SERVER_IP:~/mcleave/data/

# Restart to load the new database
ssh root@YOUR_SERVER_IP "cd ~/mcleave && docker-compose restart"
```

### Step 5: Configure Firewall

```bash
# Allow HTTP traffic
sudo ufw allow 3001/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Step 6: Access Your Application

Open browser and go to:
```
http://YOUR_SERVER_IP:3001
```

---

## Optional: Custom Domain + HTTPS (Recommended)

### Using Nginx + Certbot

```bash
# Install nginx
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/mcleave << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/mcleave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

## Maintenance Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Update (after git pull)
docker-compose down
docker-compose up -d --build

# Backup database
docker cp mcleave_mcleave_1:/app/data/mcleave.db ./backup-$(date +%Y%m%d).db

# Check status
docker-compose ps
```

---

## Troubleshooting

### Port already in use
```bash
# Find what's using port 3001
sudo lsof -i :3001

# Kill it or change port in docker-compose.yml
```

### Permission denied
```bash
sudo chown -R $USER:$USER ~/mcleave
```

### Database locked
```bash
docker-compose down
sudo rm -f data/mcleave.db-shm data/mcleave.db-wal
docker-compose up -d
```

---

## Security Checklist

- [ ] Change default JWT_SECRET in .env
- [ ] Enable UFW firewall
- [ ] Set up HTTPS with Let's Encrypt
- [ ] Regular backups of data/mcleave.db
- [ ] Keep Docker and system updated
- [ ] Use SSH key authentication (disable password login)
- [ ] Consider fail2ban for brute force protection

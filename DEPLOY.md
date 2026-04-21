# McLeave Deployment Guide

## Option 1: Railway (Recommended - Easiest)

### Steps:
1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and sign up
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your McLeave repository
5. Railway will automatically detect the `railway.json` and `Dockerfile`
6. Add environment variables in Railway dashboard:
   - `JWT_SECRET` - Generate a random string
7. Deploy! Railway gives you a public URL

**Cost:** Free tier ($5 credit/month)

---

## Option 2: Render (Free Forever)

### Steps:
1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up
3. Click "New Web Service"
4. Connect your GitHub repo
5. Select the `render.yaml` blueprint
6. Render will auto-configure everything
7. Deploy!

**Cost:** Free tier (always free)

---

## Option 3: Docker (Any VPS/Droplet)

### Local Build:
```bash
docker build -t mcleave .
docker run -p 3001:3001 -v ./data:/app/data mcleave
```

### VPS Deployment (DigitalOcean, AWS, etc.):
```bash
# On your VPS
git clone <your-repo>
cd mcleave
docker-compose up -d
```

**Cost:** $5-10/month for VPS

---

## Option 4: Manual VPS (Ubuntu Server)

### Server Setup:
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone and setup
git clone <your-repo>
cd mcleave/server
npm install

# Create environment file
echo "JWT_SECRET=your-secret-key" > .env
echo "PORT=3001" >> .env

# Start with PM2
pm2 start server.js --name mcleave
pm2 startup
pm2 save
```

---

## Database Migration

After deployment, you'll need to migrate your SQLite database:

```bash
# Copy your local database to the server
scp server/mcleave.db root@your-server:/path/to/data/
```

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT tokens | `super-random-string-123` |
| `DB_PATH` | Path to SQLite database | `/app/data/mcleave.db` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `production` |

---

## Post-Deployment Checklist

- [ ] Update frontend API URL in `src/api.ts` to point to your deployed backend
- [ ] Set strong `JWT_SECRET`
- [ ] Migrate database data
- [ ] Test all features (login, requests, etc.)
- [ ] Set up backups for database
- [ ] Configure custom domain (optional)

---

## Which One Should You Choose?

| Use Case | Recommended Platform |
|----------|---------------------|
| Quick & easy | Railway |
| Completely free | Render |
| Full control | Docker + VPS |
| Enterprise/scale | AWS/DigitalOcean + PostgreSQL |

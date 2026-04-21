#!/bin/bash
# McLeave VPS Deployment Script
# Run this on your VPS server

set -e

echo "🚀 McLeave VPS Deployment Script"
echo "================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please log out and back in, then run this script again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
fi

# Create project directory
PROJECT_DIR="$HOME/mcleave"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "📁 Project directory: $PROJECT_DIR"

# Check if already cloned
if [ ! -d ".git" ]; then
    echo "⚠️  Please clone your repository first:"
    echo "   git clone <your-repo-url> ."
    exit 1
fi

# Create data directory
mkdir -p data

# Generate JWT secret if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    JWT_SECRET=$(openssl rand -base64 32)
    cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=$JWT_SECRET
DB_PATH=/app/data/mcleave.db
EOF
    echo "✅ .env created with secure JWT secret"
fi

# Build and start
echo "🔨 Building and starting McLeave..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Wait for healthcheck
echo "⏳ Waiting for service to start..."
sleep 5

# Check if running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ McLeave is running!"
    echo ""
    echo "🌐 Access your application at:"
    echo "   http://$(curl -s ifconfig.me):3001"
    echo ""
    echo "📊 Health check: http://$(curl -s ifconfig.me):3001/api/health"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop: docker-compose down"
    echo "   Restart: docker-compose restart"
    echo "   Update: docker-compose pull && docker-compose up -d"
else
    echo "❌ Service failed to start. Check logs:"
    echo "   docker-compose logs"
    exit 1
fi

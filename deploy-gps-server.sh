#!/bin/bash
# =============================================================================
# GPS Relay Server - Deployment Script
# =============================================================================
# 
# This script deploys the GPS Relay Server on a Linux VPS/server.
# It can use either Docker or raw Node.js.
#
# Usage:
#   chmod +x deploy-gps-server.sh
#   
#   # Deploy with Docker (recommended):
#   ./deploy-gps-server.sh docker
#
#   # Deploy with raw Node.js:
#   ./deploy-gps-server.sh node
#
#   # Deploy with custom port:
#   GPS_RELAY_PORT=8080 ./deploy-gps-server.sh docker
# =============================================================================

set -e

# Configuration (override with env vars; secrets come from the environment, never hardcoded)
GPS_RELAY_PORT=${GPS_RELAY_PORT:-3001}
GPS_RELAY_LOG_LEVEL=${GPS_RELAY_LOG_LEVEL:-info}
INSTALL_DIR=${INSTALL_DIR:-/opt/paginacabexudos-gps}
NODE_VERSION="20"
# Secrets/domains injected from the calling environment (Render dashboard / CI / shell exports).
# Required in production: AUTHORIZED_GPS_DEVICES (JSON), CORS_ORIGIN (exact https origin), HEALTH_TOKEN.
AUTHORIZED_GPS_DEVICES=${AUTHORIZED_GPS_DEVICES:-}
CORS_ORIGIN=${CORS_ORIGIN:-*}
HEALTH_TOKEN=${HEALTH_TOKEN:-}

print_banner() {
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║   🗺️  PAGINACABEXUDOS - GPS Relay Server       ║"
  echo "║   Deployment Script                             ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
}

deploy_docker() {
  echo "🚀 Deploying with Docker..."
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install Docker first:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
  fi

  # Check docker-compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose not found."
    exit 1
  fi

  # Build and start
  echo "📦 Building Docker image..."
  cd "$(dirname "$0")/gps-relay-server"
  docker build -t paginacabexudos-gps-relay:latest .

  echo "▶️  Starting container..."
  if [ -z "${AUTHORIZED_GPS_DEVICES}" ]; then
    echo "⚠️  AUTHORIZED_GPS_DEVICES is empty: the server will boot with the dev fallback token. Set it in the environment for production."
  fi
  docker run -d \
    --name paginacabexudos-gps-relay \
    --restart unless-stopped \
    -p ${GPS_RELAY_PORT}:3001 \
    -e PORT=3001 \
    -e HOST=0.0.0.0 \
    -e LOG_LEVEL=${GPS_RELAY_LOG_LEVEL} \
    -e CORS_ORIGIN=${CORS_ORIGIN} \
    -e AUTHORIZED_GPS_DEVICES=${AUTHORIZED_GPS_DEVICES} \
    -e HEALTH_TOKEN=${HEALTH_TOKEN} \
    paginacabexudos-gps-relay:latest

  echo ""
  echo "✅ GPS Relay Server deployed with Docker!"
  echo "   WebSocket: ws://YOUR_SERVER_IP:${GPS_RELAY_PORT}"
  echo "   Health:    http://YOUR_SERVER_IP:${GPS_RELAY_PORT}/health?key=\$HEALTH_TOKEN"
  echo ""
  echo "📱 To send GPS from your phone, open in your mobile browser:"
  echo "   https://YOUR_REACT_APP_DOMAIN/gps-emisor?token=<TOKEN_FROM_AUTHORIZED_GPS_DEVICES>"
  echo "🌐 To view on the web app, open /recorridos and select 'Prueba Barrio' with GPS Real mode."
}

deploy_node() {
  echo "🚀 Deploying with Node.js..."

  # Check Node.js
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
  fi

  # Create install directory
  sudo mkdir -p ${INSTALL_DIR}
  sudo chown $(whoami):$(whoami) ${INSTALL_DIR}

  # Copy files
  cd "$(dirname "$0")"
  cp -r gps-relay-server/* ${INSTALL_DIR}/
  cd ${INSTALL_DIR}

  # Install dependencies
  echo "📦 Installing dependencies..."
  npm install --production

  # Create systemd service
  echo "📝 Creating systemd service..."
  sudo tee /etc/systemd/system/paginacabexudos-gps-relay.service > /dev/null << EOF
[Unit]
Description=PAGINACABEXUDOS GPS Relay Server
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/node ${INSTALL_DIR}/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${GPS_RELAY_PORT}
Environment=HOST=0.0.0.0
Environment=LOG_LEVEL=${GPS_RELAY_LOG_LEVEL}
Environment="CORS_ORIGIN=${CORS_ORIGIN}"
Environment='AUTHORIZED_GPS_DEVICES=${AUTHORIZED_GPS_DEVICES}'
Environment='HEALTH_TOKEN=${HEALTH_TOKEN}'

[Install]
WantedBy=multi-user.target
EOF

  # Enable and start service
  sudo systemctl daemon-reload
  sudo systemctl enable paginacabexudos-gps-relay
  sudo systemctl start paginacabexudos-gps-relay

  echo ""
  echo "✅ GPS Relay Server deployed with Node.js!"
  echo "   WebSocket: ws://YOUR_SERVER_IP:${GPS_RELAY_PORT}"
  echo "   Health:    http://YOUR_SERVER_IP:${GPS_RELAY_PORT}/health"
  echo ""
  echo "📋 Commands:"
  echo "   sudo systemctl status paginacabexudos-gps-relay"
  echo "   sudo systemctl restart paginacabexudos-gps-relay"
  echo "   sudo journalctl -u paginacabexudos-gps-relay -f"
}

# Main
print_banner

if [ "$1" = "docker" ]; then
  deploy_docker
elif [ "$1" = "node" ]; then
  deploy_node
else
  echo "Usage: $0 {docker|node}"
  echo ""
  echo "  docker  - Deploy using Docker (recommended)"
  echo "  node    - Deploy using raw Node.js with systemd"
  exit 1
fi
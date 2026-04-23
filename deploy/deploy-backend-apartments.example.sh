#!/bin/bash
set -euo pipefail

APP_ROOT="/root/workspace/chogo_apartments"
BACKEND_BIN="$APP_ROOT/backend/chogo-apartments"
SERVICE_NAME="chogo-apartments-backend.service"

echo "Updating backend source..."
cd "$APP_ROOT"
git pull origin main

echo "Building backend..."
cd "$APP_ROOT/backend"
go build -o chogo-apartments ./cmd
chmod +x "$BACKEND_BIN"

echo "Restarting backend service..."
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager --lines=20

echo "Backend deployed successfully."
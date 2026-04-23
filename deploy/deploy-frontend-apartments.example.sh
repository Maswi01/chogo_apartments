#!/bin/bash
set -euo pipefail

APP_ROOT="/root/workspace/chogo_apartments"
WEB_ROOT="/var/www/chogo_apartments/frontend/dist"
LOCAL_DIST="$APP_ROOT/frontend/dist"

echo "Updating frontend source..."
cd "$APP_ROOT"
git pull origin main

echo "Installing frontend dependencies..."
cd "$APP_ROOT/frontend"
npm install

echo "Building frontend..."
rm -rf "$LOCAL_DIST"
npm run build

echo "Syncing build output to Nginx web root..."
sudo rm -rf "$WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -av "$LOCAL_DIST/" "$WEB_ROOT/"
sudo chown -R www-data:www-data /var/www/chogo_apartments
sudo find /var/www/chogo_apartments -type d -exec chmod 755 {} \;
sudo find /var/www/chogo_apartments -type f -exec chmod 644 {} \;

echo "Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "Frontend deployed successfully."
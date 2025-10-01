#!/bin/bash
set -e

cd /var/www/vhosts/sweetwaterurbanfarms.com/mcp.sproutify.app
echo ">>> Pulling latest code..."
git fetch origin
git pull origin main

echo ">>> Installing deps..."
npm install

echo ">>> Building..."
npm run build

echo ">>> Restarting PM2..."
pm2 restart sproutify-mcp
pm2 save

echo ">>> Done!"

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/oracle_viles}"
BRANCH="${BRANCH:-main}"
PM2_APP="${PM2_APP:-oracle-viles}"

echo "==> Updating ${PM2_APP} in ${APP_DIR}"

for command_name in git npm pm2; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: ${command_name} is not installed or not available in PATH" >&2
    exit 1
  fi
done

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Error: ${APP_DIR} is not a git repository" >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  echo "Warning: .env not found. Create it from .env.example and add GROQ_API_KEY." >&2
fi

echo "==> Fetching latest changes"
git fetch origin "$BRANCH"

echo "==> Resetting local code to origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "==> Stopping PM2 app for data migration"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 stop "$PM2_APP" || true
fi

if [ -f "data/veles.db" ] && [ ! -f "data/veles-store.json" ]; then
  if command -v python3 >/dev/null 2>&1; then
    echo "==> Migrating SQLite data to JSON store"
    APP_DIR="$APP_DIR" python3 scripts/migrate-sqlite-to-json.py
  else
    echo "Error: python3 is required to migrate data/veles.db to data/veles-store.json" >&2
    exit 1
  fi
fi

echo "==> Installing production dependencies"
npm ci --omit=dev

echo "==> Restarting PM2 app"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "==> Health check"
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-3000}/health"
echo
echo "==> Done"

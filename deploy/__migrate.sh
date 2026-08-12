#!/usr/bin/env bash
# One-shot helper used by the operator when the runner image is missing
# the transitive `effect` dependency that Prisma 7's CLI needs. Meant to
# run from /opt/propertydesk on the VPS.
set -euo pipefail

cd /opt/propertydesk

echo "[1/3] Ensuring 'effect' is installed inside the app container ..."
docker compose exec -T app sh -c '
  cd /app
  if [ ! -d node_modules/effect ]; then
    npm install --no-save --no-audit --no-fund --no-package-lock effect >/tmp/eff.log 2>&1
    tail -3 /tmp/eff.log
  else
    echo "  effect already installed - skipping"
  fi
'

echo "[2/3] Running prisma migrate deploy ..."
# Prisma 7's `env()` helper inside prisma.config.ts resolves against a
# `.env` file only, not against the ambient process env. We create a
# writable copy in /tmp and point dotenv at it via DOTENV_CONFIG_PATH.
docker compose exec -T --user root \
  app sh -c '
  cd /app
  DIRECT_URL_FALLBACK="${DIRECT_URL:-${DATABASE_URL:-}}"
  if [ -z "$DIRECT_URL_FALLBACK" ]; then
    echo "ERROR: neither DIRECT_URL nor DATABASE_URL is set inside the container" >&2
    exit 1
  fi
  {
    echo "DIRECT_URL=$DIRECT_URL_FALLBACK"
    echo "DATABASE_URL=${DATABASE_URL:-$DIRECT_URL_FALLBACK}"
  } > /app/.env
  chmod 600 /app/.env
  chown nextjs:nodejs /app/.env
  npx prisma migrate deploy
'

echo "[3/3] Restarting app container to pick up new schema ..."
docker compose restart app

echo "Done."

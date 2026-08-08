#!/usr/bin/env bash
# Remote half of the deploy flow. Executed on the VPS via
# `ssh HOST bash -s < remote-deploy.sh` with these env vars:
#
#   REMOTE_DIR  — target install path (default /opt/propertydesk)
#   COMPOSE_CMD — one of `docker compose up -d` / `... --build`
#
# See deploy/deploy.ps1 (local orchestrator) for the full flow.
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/propertydesk}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose up -d --build}"

cd "$REMOTE_DIR"

if [ ! -f .env ]; then
  echo '(first-run) seeding .env from deploy/env.production.template'
  mkdir -p _extract
  tar -xzf /tmp/payload.tar.gz -C _extract ./deploy/env.production.template 2>/dev/null || true
  if [ -f _extract/deploy/env.production.template ]; then
    mv _extract/deploy/env.production.template .env
    chmod 600 .env
  fi
  rm -rf _extract
fi

echo '(cleaning previous source, keeping .env and storage)'
find . -mindepth 1 -maxdepth 1 \
  ! -name '.env' \
  ! -name '.env.*' \
  ! -name 'storage' \
  -exec rm -rf {} +

echo '(extracting payload)'
tar -xzf /tmp/payload.tar.gz -C .
rm -f /tmp/payload.tar.gz

if [ ! -f docker-compose.yml ]; then
  echo 'ERROR: docker-compose.yml missing from payload' >&2
  exit 1
fi

# On the 1 GiB-RAM droplet the running production container competes
# with the webpack builder for RAM and swap, causing the SSH session to
# die mid-build. Stop the app (but keep caddy so the marketing landing
# still terminates TLS) to hand the full 17 GiB swap over to Docker's
# builder. Compose will bring the new image back up in the next step.
if docker compose ps --status running app 2>/dev/null | grep -q propertydesk-app; then
  echo '(stopping app container to free RAM for build)'
  docker compose stop app || true
fi

# Run `docker compose up -d --build` DETACHED, streaming full output to
# /tmp/build.log. The webpack build takes ~7 min of silence on the
# 1 GiB-RAM droplet, longer than a single SSH channel with piped stdin
# reliably stays open. deploy.ps1 polls /tmp/build.log via short SSH
# sessions until it observes the terminal "DONE" or "FAILED" marker.
: > /tmp/build.log
rm -f /tmp/build.done /tmp/build.failed
echo "(compose: $COMPOSE_CMD - detached, logging to /tmp/build.log)"
nohup bash -c "
  set -e
  $COMPOSE_CMD
  echo '===BUILD-DONE==='
" > /tmp/build.log 2>&1 &
BUILD_PID=$!
echo "(build PID: $BUILD_PID)"

# Local orchestrator (deploy.ps1) tails /tmp/build.log and waits for the
# marker. We exit successfully immediately so the SSH session doesn't
# hold the pipe open through the 7-minute silence.
# `docker image prune` runs from deploy.ps1 AFTER the build finishes to
# avoid competing for the docker daemon lock while a build is in flight.

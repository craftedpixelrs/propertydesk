#!/usr/bin/env bash
# Remote half of the git-based deploy. Executed on the VPS via
# `ssh HOST bash -s < git-deploy.sh` with these env vars:
#
#   REMOTE_DIR  — target install path (default /opt/propertydesk)
#   REPO_URL    — https clone URL of the public GitHub repo
#   BRANCH      — branch to deploy (default main)
#   COMPOSE_CMD — one of `docker compose up -d` / `... --build`
#
# Unlike remote-deploy.sh (tarball upload), the source comes straight
# from GitHub, so the deployed tree is always an exact, identifiable
# commit. See deploy/git-deploy.ps1 for the local orchestrator.
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/propertydesk}"
REPO_URL="${REPO_URL:-https://github.com/craftedpixelrs/propertydesk.git}"
BRANCH="${BRANCH:-main}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose up -d --build}"

mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"

# A build left over from a previous (possibly interrupted) deploy would
# fight this one for the docker daemon lock and the droplet's RAM.
if pgrep -f -- 'docker compose up' >/dev/null 2>&1; then
  echo '(killing leftover compose build from a previous deploy)'
  pkill -f -- 'docker compose up' || true
  sleep 5
fi

# `.env` holds production secrets and is never in git. Keep a dated copy
# outside the deploy dir so a botched checkout can never lose it.
if [ -f .env ]; then
  mkdir -p /root/env-backups
  cp -a .env "/root/env-backups/.env.$(date +%Y%m%d-%H%M%S)"
fi

if [ ! -d .git ]; then
  echo "(first git deploy) attaching $REMOTE_DIR to $REPO_URL"
  git init -q -b "$BRANCH"
  git remote add origin "$REPO_URL"
fi

git remote set-url origin "$REPO_URL"

echo "(fetching $BRANCH)"
git fetch --depth=1 origin "$BRANCH"
git reset --hard "origin/$BRANCH"

DEPLOYED_SHA="$(git rev-parse --short HEAD)"
DEPLOYED_MSG="$(git log -1 --pretty=%s)"
echo "(deploying $DEPLOYED_SHA — $DEPLOYED_MSG)"

if [ ! -f .env ]; then
  echo '(first-run) seeding .env from deploy/env.production.template'
  cp deploy/env.production.template .env
  chmod 600 .env
fi

if [ ! -f docker-compose.yml ]; then
  echo 'ERROR: docker-compose.yml missing from checkout' >&2
  exit 1
fi

# On the 1 GiB-RAM droplet the running production container competes
# with the webpack builder for RAM and swap, causing the SSH session to
# die mid-build. Stop the app (but keep caddy so the marketing landing
# still terminates TLS) to hand the full swap over to Docker's builder.
if docker compose ps --status running app 2>/dev/null | grep -q propertydesk-app; then
  echo '(stopping app container to free RAM for build)'
  docker compose stop app || true
fi

# Run compose DETACHED, streaming full output to /tmp/build.log. The
# webpack build takes several minutes of silence on this droplet, longer
# than a single SSH channel with piped stdin reliably stays open.
# git-deploy.ps1 polls /tmp/build.log via short SSH sessions until it
# observes the terminal marker.
: > /tmp/build.log
echo "(compose: $COMPOSE_CMD — detached, logging to /tmp/build.log)"
nohup bash -c "
  set -e
  cd '$REMOTE_DIR'
  $COMPOSE_CMD
  echo '(applying database migrations)'
  docker compose exec -T app node_modules/.bin/prisma migrate deploy < /dev/null
  echo '===BUILD-DONE==='
" > /tmp/build.log 2>&1 &

echo "(build PID: $!)"
echo "(deployed commit: $DEPLOYED_SHA)"

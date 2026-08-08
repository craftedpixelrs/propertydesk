#!/usr/bin/env bash
# =============================================================================
# PropertyDesk VPS provisioning — Ubuntu 24.04
#
# Idempotent. Safe to re-run. Does three things, in order:
#   1) BACKUP anything worth keeping into /root/backups/*.tar.gz
#   2) REMOVE the old stack (nginx, certbot, pm2, standalone Node)
#   3) INSTALL Docker Engine + Compose plugin + configure UFW
#
# Intended to be piped from the local machine:
#   Get-Content deploy/provision.sh -Raw | ssh root@HOST "bash -s"
# =============================================================================
set -euo pipefail

log()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }

STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/backups"
mkdir -p "$BACKUP_DIR"

# -----------------------------------------------------------------------------
# 1) BACKUP anything the previous deployment might have left behind.
# -----------------------------------------------------------------------------
log "Backup phase → $BACKUP_DIR"

if [[ -d /var/www/prodaja-stanova-app ]]; then
  tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
      -czf "$BACKUP_DIR/prodaja-stanova-app-$STAMP.tar.gz" \
      -C /var/www prodaja-stanova-app
  ok "  saved /var/www/prodaja-stanova-app → prodaja-stanova-app-$STAMP.tar.gz"
fi

if [[ -d /etc/nginx ]]; then
  tar -czf "$BACKUP_DIR/nginx-$STAMP.tar.gz" -C /etc nginx
  ok "  saved /etc/nginx → nginx-$STAMP.tar.gz"
fi

if [[ -d /etc/letsencrypt ]]; then
  tar -czf "$BACKUP_DIR/letsencrypt-$STAMP.tar.gz" -C /etc letsencrypt
  ok "  saved /etc/letsencrypt → letsencrypt-$STAMP.tar.gz"
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 save >/dev/null 2>&1 || true
  if [[ -d /root/.pm2 ]]; then
    tar -czf "$BACKUP_DIR/pm2-$STAMP.tar.gz" -C /root .pm2 2>/dev/null || true
    ok "  saved /root/.pm2 → pm2-$STAMP.tar.gz"
  fi
fi

# -----------------------------------------------------------------------------
# 2) REMOVE the old stack.
# -----------------------------------------------------------------------------
log "Removing old services"

# PM2 first so it doesn't respawn Node while we rip things out.
if command -v pm2 >/dev/null 2>&1; then
  pm2 kill >/dev/null 2>&1 || true
  systemctl stop pm2-root 2>/dev/null || true
  systemctl disable pm2-root 2>/dev/null || true
  rm -f /etc/systemd/system/pm2-root.service
  systemctl daemon-reload
  npm uninstall -g pm2 >/dev/null 2>&1 || true
  rm -rf /root/.pm2
  ok "  PM2 removed"
fi

# nginx + certbot
if systemctl list-unit-files | grep -q '^nginx.service'; then
  systemctl stop nginx 2>/dev/null || true
  systemctl disable nginx 2>/dev/null || true
fi
DEBIAN_FRONTEND=noninteractive apt-get purge -y \
  nginx nginx-common nginx-core \
  certbot python3-certbot-nginx \
  >/dev/null 2>&1 || true
rm -rf /etc/nginx /var/log/nginx /var/lib/nginx /etc/letsencrypt /var/log/letsencrypt
rm -f /etc/cron.d/certbot
ok "  nginx + certbot removed"

# Old application content
if [[ -d /var/www/prodaja-stanova-app ]]; then
  rm -rf /var/www/prodaja-stanova-app
  ok "  /var/www/prodaja-stanova-app removed (backup kept above)"
fi
rm -rf /var/www/html

# Node.js from apt / nodesource — we'll only run Node inside Docker from now on.
if command -v node >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get purge -y \
    nodejs npm libnode-dev \
    >/dev/null 2>&1 || true
  rm -f /etc/apt/sources.list.d/nodesource.list
  rm -rf /usr/local/lib/node_modules /root/.npm /root/.cache/pnpm
  ok "  system Node.js removed"
fi

DEBIAN_FRONTEND=noninteractive apt-get autoremove -y >/dev/null 2>&1 || true

# -----------------------------------------------------------------------------
# 3) INSTALL Docker Engine + Compose plugin
# -----------------------------------------------------------------------------
log "Installing Docker Engine"

if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl gnupg lsb-release rsync ufw jq >/dev/null

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  UBUNTU_CODENAME="$(lsb_release -cs)"
  cat > /etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $UBUNTU_CODENAME stable
EOF

  apt-get update -y >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin \
    >/dev/null

  systemctl enable --now docker >/dev/null
  ok "  Docker installed: $(docker --version)"
else
  ok "  Docker already installed: $(docker --version)"
fi

# -----------------------------------------------------------------------------
# 4) UFW firewall — open SSH, HTTP, HTTPS. Docker manages its own iptables.
# -----------------------------------------------------------------------------
log "Configuring UFW"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
ok "  UFW active — 22/tcp, 80/tcp, 443/tcp+udp allowed"

# -----------------------------------------------------------------------------
# 5) Prepare application directory
# -----------------------------------------------------------------------------
log "Preparing /opt/propertydesk"
mkdir -p /opt/propertydesk
ok "  ready"

log "VPS is provisioned."
echo
df -h / | sed 's/^/  /'
free -h  | sed 's/^/  /'

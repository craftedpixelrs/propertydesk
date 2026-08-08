#!/usr/bin/env bash
set -u
echo '=== Docker ==='
if command -v docker >/dev/null 2>&1; then
  docker ps -a
  echo '--- images ---'
  docker images
else
  echo 'docker: not installed'
fi
echo
echo '=== Ports listening ==='
ss -tlnp 2>/dev/null || netstat -tlnp

echo
echo '=== Custom systemd active ==='
systemctl list-units --type=service --state=active --no-pager \
  | grep -Ev 'system-|user@|getty|snapd|networkd|resolved|logind|cron|ssh|dbus|acpid|apparmor|systemd-|multipathd|udev|polkitd|walinuxagent|do-agent|unattended|packagekit|chrony|serial-getty' \
  | head -40

echo
echo '=== /opt and /srv ==='
ls -la /opt 2>/dev/null || true
ls -la /srv 2>/dev/null || true

echo
echo '=== /root ==='
ls -la /root

echo
echo '=== Web servers ==='
for s in nginx apache2 caddy httpd; do
  echo "  $s: $(systemctl is-active $s 2>/dev/null || echo n/a)"
done

echo
echo '=== Local databases ==='
for s in postgresql mysql mariadb mongod redis-server; do
  echo "  $s: $(systemctl is-active $s 2>/dev/null || echo n/a)"
done

echo
echo '=== Root crontab ==='
crontab -l 2>/dev/null || echo '  (no root crontab)'
echo '--- /etc/cron.d ---'
ls /etc/cron.d/ 2>/dev/null || true

echo
echo '=== UFW firewall ==='
ufw status 2>/dev/null || echo 'ufw: not installed'

echo
echo '=== Node / pnpm / other runtimes ==='
for c in node npm pnpm python3 java; do
  if command -v $c >/dev/null 2>&1; then
    echo "  $c: $($c --version 2>&1 | head -1)"
  else
    echo "  $c: not installed"
  fi
done

echo
echo '=== /var/www ==='
ls -la /var/www 2>/dev/null || echo '  (missing)'

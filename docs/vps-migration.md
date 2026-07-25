# VPS Migration

Recipe for migrating PropertyDesk from managed hosting (Neon + Vercel /
Fly) to a self-hosted VPS running Docker Compose + nginx.

## Target VPS shape

- Ubuntu 24.04 LTS.
- 4 vCPU / 8 GB RAM / 80 GB NVMe minimum. Scale later as needed.
- Docker Engine 25+ with the Compose plugin.
- nginx (system package) as a TLS terminator.

## 1. Prep the VPS

```bash
# Add non-root user
adduser propertydesk
usermod -aG docker propertydesk

# Docker + Compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin nginx certbot python3-certbot-nginx
```

Configure the firewall (ufw):

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 2. Copy the app

```bash
# On the VPS as `propertydesk`
git clone https://github.com/propertydesk/propertydesk.git /opt/propertydesk
cd /opt/propertydesk
cp .env.example .env
$EDITOR .env  # fill in real secrets
```

## 3. Migrate Postgres from Neon

Take a fresh dump from Neon and load it into the compose DB:

```bash
# On any workstation with network access to Neon
pg_dump "postgres://user:pass@ep-*.neon.tech/propertydesk?sslmode=require" \
        --format=custom -f neon.pgcustom

scp neon.pgcustom propertydesk@vps.example.com:/opt/propertydesk/backups/
```

Then on the VPS:

```bash
cd /opt/propertydesk
docker compose up -d db
docker compose exec db pg_restore -U propertydesk -d propertydesk --clean --if-exists \
                                  < backups/neon.pgcustom
```

Cross-check with `\dt+` and expected row counts. Run
`pnpm prisma migrate deploy` inside the app container after the DB is
loaded (should be a no-op).

## 4. Object storage

If you're moving from S3 to the local provider:

```bash
aws s3 sync s3://propertydesk-prod ./storage
```

Set `STORAGE_PROVIDER=local` and `STORAGE_LOCAL_DIR=/app/storage` in
`.env`. The compose file already binds a persistent volume.

If you keep S3, just update the `S3_*` vars.

## 5. Start the app

```bash
docker compose build
docker compose up -d
docker compose exec app pnpm prisma migrate deploy
docker compose exec app pnpm prisma db seed  # optional: only for a fresh DB
```

## 6. nginx + TLS

```nginx
server {
  listen 80;
  server_name app.propertydesk.app;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name app.propertydesk.app;

  ssl_certificate     /etc/letsencrypt/live/app.propertydesk.app/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.propertydesk.app/privkey.pem;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then:

```bash
certbot --nginx -d app.propertydesk.app
```

The app already emits HSTS, CSP, etc. — nginx only needs to terminate
TLS.

## 7. Cron

Install [`docs/cron-jobs.md`](./cron-jobs.md) entries in the system
crontab:

```bash
sudo -u propertydesk crontab -e
```

Verify with `journalctl -u cron -f`.

## 8. Cut-over checklist

1. DNS: lower TTL to 60s a day in advance.
2. Freeze writes on the source (put the old deployment in maintenance
   mode).
3. Take one last dump; load it into the VPS.
4. Update DNS A record to the VPS IP.
5. Watch `/api/v1/ready` from an external monitor for 30 min.
6. Restore normal TTL.

## 9. Rollback

If anything goes wrong within the first hour, revert the DNS A record
to the old deployment's IP — it hasn't been decommissioned yet. Keep
the source deployment paused (not deleted) for at least 7 days.

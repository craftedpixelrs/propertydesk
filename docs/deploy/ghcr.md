# Fast deploy: build locally, push to GHCR, pull on VPS

The default `deploy/deploy.ps1` uploads source code to the 1 GiB
droplet and runs `next build --webpack` there. That build needs ~2-4
GiB of RAM, so the script **stops the running app container first**,
which means every deploy has 10-15 min of `502 Bad Gateway`.

`deploy/deploy-image.ps1` avoids that entirely:

- Build runs on the developer workstation (Docker Desktop, big RAM).
- The finished image is pushed to **GitHub Container Registry (GHCR)**.
- The VPS just runs `docker compose pull && docker compose up -d` -
  the swap between old and new container is ~5-10 s and Caddy keeps
  serving the old container until the new one passes its health check.

No GitHub repository is required. Only a GitHub account and a
Personal Access Token.

---

## One-time setup

### 1. Create a GHCR-writing PAT (developer machine)

1. Open [github.com/settings/tokens](https://github.com/settings/tokens?type=beta).
2. **Generate new token → Fine-grained token**.
3. Set:
   - Name: `propertydesk-ghcr-push`
   - Expiration: 1 year (or 90 days if you rotate regularly)
   - Repository access: doesn't matter (GHCR uses user-scoped tokens).
   - Permissions → **Account permissions → Packages: Read and write**.
4. Copy the token (starts with `github_pat_...`).

### 2. Create `.env.deploy` in the repo root

The file is gitignored. Never commit it.

```dotenv
GHCR_OWNER=your-github-username
GHCR_TOKEN=github_pat_...

# All NEXT_PUBLIC_* must match production - they get baked into the
# client bundle at build time.
NEXT_PUBLIC_APP_URL=https://my.propertydesk.app
NEXT_PUBLIC_APP_NAME=PropertyDesk
NEXT_PUBLIC_APP_DOMAIN=propertydesk.app
NEXT_PUBLIC_APP_LOCALE=sr-Latn
NEXT_PUBLIC_APP_TIMEZONE=Europe/Belgrade
NEXT_PUBLIC_MY_APP_URL=https://my.propertydesk.app
NEXT_PUBLIC_LOOPS_FORM_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

### 3. Create a READ-ONLY PAT for the VPS

Same as step 1 but only **Packages: Read**. Copy it.

### 4. Log the VPS in to GHCR (one-time)

```powershell
ssh -i "$env:USERPROFILE\.ssh\demopropertydesk" root@159.89.104.12
```

On the VPS:

```bash
# Paste the READ-ONLY PAT when prompted
docker login ghcr.io -u your-github-username
```

Docker stores the credential in `/root/.docker/config.json` on the
VPS. Persists across reboots and container restarts.

---

## Deploy

From the repo root on your workstation:

```powershell
powershell -File deploy\deploy-image.ps1
```

Timeline (approx):

| Step | Duration |
|---|---|
| Build image locally | 3-5 min |
| Push image layers to GHCR | 30-60 s (mostly cached after first push) |
| VPS pull layers | 20-40 s |
| Container swap + healthcheck | 5-15 s |
| **Total downtime** | **~5-10 s** |

vs. legacy `deploy.ps1`: **10-15 min of downtime** on every deploy.

### Optional switches

```powershell
# Push a specific version tag (image also gets :latest)
powershell -File deploy\deploy-image.ps1 -Tag v1.2.0

# Build locally without pushing (image size sanity check)
powershell -File deploy\deploy-image.ps1 -SkipPush

# Push image to GHCR but don't touch the VPS
powershell -File deploy\deploy-image.ps1 -SkipPull
```

### Rollback

Every deploy tags the image with a timestamp AND `:latest`. To roll
back to a previous version:

```powershell
ssh -i "$env:USERPROFILE\.ssh\demopropertydesk" root@159.89.104.12
```

On the VPS:

```bash
cd /opt/propertydesk
# List available tags
docker images ghcr.io/your-github-username/propertydesk-app
# Set .env to the older tag, then pull + up
sed -i 's|^IMAGE=.*|IMAGE=ghcr.io/your-github-username/propertydesk-app:prod-20260722-101500|' .env
docker compose pull app
docker compose up -d --no-build app
```

---

## When you eventually add a GitHub repo

Once the code lives in a GH repo, add `.github/workflows/deploy.yml`
that does exactly the same three steps as `deploy-image.ps1`:

1. `docker/login-action` with the `${{ secrets.GITHUB_TOKEN }}`
   (auto-provided, no PAT needed).
2. `docker/build-push-action` with the same tag + args.
3. `appleboy/ssh-action` that SSHes into the VPS and runs
   `docker compose pull && docker compose up -d --no-build app`.

The `docker-compose.yml`, VPS setup and rollback flow all stay
identical - only the "who runs the build" changes.

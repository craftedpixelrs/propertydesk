# =============================================================================
# PropertyDesk fast deploy - build locally, push to GHCR, pull on VPS
#
# Zero-downtime replacement for `deploy.ps1`. Uses the vastly bigger
# workstation to run `docker buildx build` (3-5 min), pushes the image
# to GitHub Container Registry, then just tells the VPS to
# `docker compose pull && up -d`. The 1 GiB droplet no longer runs the
# webpack build itself, so the running container stays up during deploy
# and the swap is a ~5-10 s container restart.
#
# Prerequisites (one-time, see docs/deploy/ghcr.md):
#   1. GitHub account with a Personal Access Token that has
#      `write:packages` scope. Set the env vars:
#         $env:GHCR_OWNER = "your-github-username"
#         $env:GHCR_TOKEN = "ghp_xxx..."
#      (Or drop them in a `.env.deploy` file at the repo root; it's
#       gitignored and auto-loaded by this script.)
#   2. VPS is logged in to GHCR:  ssh root@... "docker login ghcr.io"
#      (same PAT, or a `read:packages`-only PAT for the server).
#   3. Docker Desktop installed locally with `buildx` (default in DD
#      4+).
#
# Usage (from repo root):
#   powershell -File deploy\deploy-image.ps1
#
# Optional switches:
#   -Tag        e.g. `v1.2.0` (default: unix timestamp + short hash)
#   -SkipPush   build locally but don't push (dry-run for image size)
#   -SkipPull   push but don't touch the VPS (staging into GHCR only)
# =============================================================================

param(
  [string]$RemoteHost = "159.89.104.12",
  [string]$User       = "root",
  [string]$KeyPath    = "$env:USERPROFILE\.ssh\demopropertydesk",
  [string]$RemoteDir  = "/opt/propertydesk",
  [string]$Tag        = "",
  [switch]$SkipPush,
  [switch]$SkipPull
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Info($msg)  { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[+] $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Bad($msg)   { Write-Host "[x] $msg" -ForegroundColor Red }

# ----- 0) load .env.deploy if it exists -----------------------------------
if (Test-Path .env.deploy) {
  Info "loading .env.deploy"
  Get-Content .env.deploy | ForEach-Object {
    if ($_ -match "^\s*([A-Z_]+)\s*=\s*(.+?)\s*$") {
      [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
  }
}

# ----- 1) validate env ----------------------------------------------------
$owner = $env:GHCR_OWNER
$token = $env:GHCR_TOKEN
if (-not $owner) { Bad "GHCR_OWNER env var missing (see deploy/deploy-image.ps1 header)"; exit 1 }
if (-not $SkipPush -and -not $token) {
  Bad "GHCR_TOKEN env var missing - required for `docker push ghcr.io/*`"
  Bad "Create at https://github.com/settings/tokens?type=beta -> scope: write:packages"
  exit 1
}

# ----- 2) compute tag -----------------------------------------------------
if (-not $Tag) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $Tag = "prod-$stamp"
}
$image = "ghcr.io/$($owner.ToLower())/propertydesk-app"
$fullTag = "${image}:$Tag"
$latestTag = "${image}:latest"
Info "building image  $fullTag  (also tagged as :latest)"

# ----- 3) docker login to ghcr --------------------------------------------
if (-not $SkipPush) {
  Info "authenticating to ghcr.io as $owner"
  $token | & docker login ghcr.io -u $owner --password-stdin | Out-Null
  if ($LASTEXITCODE -ne 0) { Bad "docker login failed"; exit 1 }
}

# ----- 4) build ------------------------------------------------------------
# `--platform linux/amd64` is critical when building on Apple Silicon
# but harmless on x86 workstations. `--push` streams layers straight
# to GHCR (skips loading into local daemon → faster on Windows).
$builderArgs = @(
  "buildx", "build",
  "--platform", "linux/amd64",
  "--tag", $fullTag,
  "--tag", $latestTag,
  "--build-arg", "NEXT_PUBLIC_APP_URL=$($env:NEXT_PUBLIC_APP_URL)",
  "--build-arg", "NEXT_PUBLIC_APP_NAME=$($env:NEXT_PUBLIC_APP_NAME)",
  "--build-arg", "NEXT_PUBLIC_APP_DOMAIN=$($env:NEXT_PUBLIC_APP_DOMAIN)",
  "--build-arg", "NEXT_PUBLIC_APP_LOCALE=$($env:NEXT_PUBLIC_APP_LOCALE)",
  "--build-arg", "NEXT_PUBLIC_APP_TIMEZONE=$($env:NEXT_PUBLIC_APP_TIMEZONE)",
  "--build-arg", "NEXT_PUBLIC_MY_APP_URL=$($env:NEXT_PUBLIC_MY_APP_URL)",
  "--build-arg", "NEXT_PUBLIC_LOOPS_FORM_ID=$($env:NEXT_PUBLIC_LOOPS_FORM_ID)",
  "--build-arg", "NEXT_PUBLIC_SENTRY_DSN=$($env:NEXT_PUBLIC_SENTRY_DSN)"
)
if ($SkipPush) { $builderArgs += @("--load") } else { $builderArgs += @("--push") }
$builderArgs += "."
& docker @builderArgs
if ($LASTEXITCODE -ne 0) { Bad "docker buildx build failed"; exit 1 }
Ok "image built$(if (-not $SkipPush) { ' and pushed to GHCR' })"

if ($SkipPull) { Ok "SkipPull set - stopping here"; exit 0 }

# ----- 5) update remote .env with new IMAGE tag ---------------------------
$ssh = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new")
Info "setting IMAGE tag on VPS"
$remoteCmd = @"
set -e
cd $RemoteDir
# Upsert IMAGE=... in .env so `docker compose pull` picks up the exact
# tag we just pushed. Keeps the previous line if the file already has
# one, otherwise appends.
if grep -q '^IMAGE=' .env; then
  sed -i 's|^IMAGE=.*|IMAGE=$fullTag|' .env
else
  echo 'IMAGE=$fullTag' >> .env
fi
echo 'IMAGE now = ' && grep '^IMAGE=' .env
"@
$remoteCmd | & ssh @ssh "${User}@${RemoteHost}" "bash -s"
if ($LASTEXITCODE -ne 0) { Bad "remote .env update failed"; exit 1 }

# ----- 6) upload docker-compose + Caddyfile (in case of infra changes) ----
Info "syncing docker-compose.yml + Caddyfile"
scp @ssh docker-compose.yml Caddyfile "${User}@${RemoteHost}:$RemoteDir/"
if ($LASTEXITCODE -ne 0) { Bad "scp of compose files failed"; exit 1 }

# ----- 7) trigger pull + rolling restart ----------------------------------
Info "pulling image on VPS + restarting"
$pullCmd = @"
set -e
cd $RemoteDir
docker compose pull app
# `up -d --no-build` starts a fresh container from the new image and
# tears down the old one. Not "true" rolling (single-replica), but the
# swap is ~5-10 s and the healthcheck gate protects Caddy from routing
# to a not-yet-ready container.
docker compose up -d --no-build app
echo '===DEPLOY-DONE==='
"@
$pullCmd | & ssh @ssh "${User}@${RemoteHost}" "bash -s"
if ($LASTEXITCODE -ne 0) { Bad "remote pull + restart failed"; exit 1 }
Ok "VPS pulled and restarted app container"

# ----- 8) health poll -----------------------------------------------------
Info "waiting for /api/health (up to 120s)"
$deadline = (Get-Date).AddSeconds(120)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "http://$RemoteHost/api/health" `
           -Headers @{ "Host" = "my.propertydesk.app" } `
           -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 5 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 3 }
}
if ($healthy) { Ok "app reports healthy - deploy done" }
else {
  Warn "/api/health did not respond in time - check 'docker compose logs -f app'"
  exit 1
}

# =============================================================================
# PropertyDesk deploy - GitHub -> VPS
#
# Unlike deploy.ps1 (which tars up the local working tree), this pulls the
# source straight from GitHub on the server, so what runs in production is
# always a named commit that exists on the remote.
#
# Steps:
#   1) Run git-deploy.sh on the server: fetch + hard-reset /opt/propertydesk
#      to origin/<branch>, keeping .env, then kick off a detached
#      `docker compose up -d --build`.
#   2) Poll /tmp/build.log until the build reports done or fails.
#   3) Prune dangling images, print compose status.
#   4) Poll /api/health until it responds or times out.
#
# Usage (from repo root, after pushing to GitHub):
#   powershell -File deploy\git-deploy.ps1
# =============================================================================

param(
  [string]$RemoteHost = "159.89.104.12",
  [string]$User       = "root",
  [string]$KeyPath    = "$env:USERPROFILE\.ssh\demopropertydesk",
  [string]$RemoteDir  = "/opt/propertydesk",
  [string]$RepoUrl    = "https://github.com/craftedpixelrs/propertydesk.git",
  [string]$Branch     = "main",
  [string]$HealthUrl  = "https://my.propertydesk.app/api/health",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Info($msg)  { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[+] $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[!] $msg" -ForegroundColor Yellow }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ssh = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new")

# ----- 1) remote fetch + detached build ------------------------------------
Info "Deploying $Branch from $RepoUrl to ${User}@${RemoteHost}:$RemoteDir"
$composeCmd = if ($SkipBuild) { 'docker compose up -d' } else { 'docker compose up -d --build' }
$remoteScriptPath = Join-Path (Split-Path -Parent $PSCommandPath) 'git-deploy.sh'
# Read as raw bytes (avoids PowerShell's implicit trailing CRLF), strip
# any CR, and pipe LF-only bytes into `bash -s` on the server.
$rawScript = [IO.File]::ReadAllText($remoteScriptPath) -replace "`r", ""
$tmpScript = Join-Path $env:TEMP "git-deploy-$stamp.sh"
[IO.File]::WriteAllBytes($tmpScript, [Text.Encoding]::UTF8.GetBytes($rawScript))
try {
  cmd /c "type `"$tmpScript`" | ssh -i `"$KeyPath`" -o StrictHostKeyChecking=accept-new ${User}@${RemoteHost} `"REMOTE_DIR='$RemoteDir' REPO_URL='$RepoUrl' BRANCH='$Branch' COMPOSE_CMD='$composeCmd' bash -s`""
  if ($LASTEXITCODE -ne 0) { throw "remote checkout / build kickoff failed" }
} finally {
  Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue
}

# ----- 2) poll build log ---------------------------------------------------
# With BuildKit cache mount for .next/cache, most builds finish in 10-15 min.
# 20 min is a safe upper bound for cold cache or large changes.
Info "Waiting for detached build (up to 20 min)"
$buildDeadline = (Get-Date).AddMinutes(20)
$buildStatus = $null
$lastLen = 0
while ((Get-Date) -lt $buildDeadline) {
  Start-Sleep -Seconds 20
  try {
    $tail = & ssh @ssh "${User}@${RemoteHost}" "wc -c /tmp/build.log | awk '{print `$1}'; tail -n 3 /tmp/build.log"
    if ($LASTEXITCODE -ne 0) { continue }
    $lines = $tail -split "`n"
    $lenNow = [int]($lines[0].Trim())
    $recent = ($lines | Select-Object -Skip 1) -join " | "
    if ($lenNow -ne $lastLen) {
      Write-Host ("    [{0} B] {1}" -f $lenNow, $recent) -ForegroundColor DarkGray
      $lastLen = $lenNow
    }
    if ($recent -match "===BUILD-DONE===") { $buildStatus = "ok"; break }
    if ($recent -match "ERROR|failed to build|exit code|Killed") { $buildStatus = "err"; break }
  } catch { }
}
if ($buildStatus -eq "ok") {
  Ok "docker build finished"
} elseif ($buildStatus -eq "err") {
  Warn "build reported an error - dumping tail of /tmp/build.log"
  & ssh @ssh "${User}@${RemoteHost}" "tail -n 60 /tmp/build.log"
  throw "remote build failed"
} else {
  Warn "build did not finish in 20 min - dumping tail for inspection"
  & ssh @ssh "${User}@${RemoteHost}" "tail -n 60 /tmp/build.log"
  throw "remote build timed out"
}

# ----- 3) prune + status ---------------------------------------------------
Info "Pruning dangling images + printing compose status"
& ssh @ssh "${User}@${RemoteHost}" "cd $RemoteDir && docker image prune -f >/dev/null && git log -1 --oneline && docker compose ps"

# ----- 4) health poll ------------------------------------------------------
# Poll the public hostname, not the origin IP: Caddy 301s plain HTTP to
# HTTPS, and hitting the origin over HTTPS trips a certificate mismatch
# because the real certificate is served by Cloudflare in front of it.
Info "Waiting for $HealthUrl (up to 240s)"
$deadline = (Get-Date).AddSeconds(240)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 5 }
}
if ($healthy) { Ok "app reports healthy" }
else { Warn "/api/health did not respond in time - check 'docker compose logs -f app'" }

Ok "done"

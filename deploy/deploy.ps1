# =============================================================================
# PropertyDesk deploy - Windows -> VPS
#
# Steps:
#   1) Pack the working tree into a tarball (skipping node_modules, .next,
#      .env, storage, .git, etc.).
#   2) scp the tarball to /tmp/payload.tar.gz on the server.
#   3) On the server: replace /opt/propertydesk atomically, install .env on
#      the first deploy only, then run `docker compose up -d --build`.
#   4) Poll /api/health until it responds or times out.
#
# Usage (from repo root):
#   powershell -File deploy\deploy.ps1
# =============================================================================

param(
  [string]$RemoteHost = "159.89.104.12",
  [string]$User       = "root",
  [string]$KeyPath    = "$env:USERPROFILE\.ssh\demopropertydesk",
  [string]$RemoteDir  = "/opt/propertydesk",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Info($msg)  { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[+] $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[!] $msg" -ForegroundColor Yellow }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archive = ".\deploy\payload-$stamp.tar.gz"

# ----- 1) pack -------------------------------------------------------------
Info "Packing source tree -> $archive"
$excludes = @(
  "--exclude=./node_modules",
  "--exclude=./.next",
  "--exclude=./.turbo",
  "--exclude=./out",
  "--exclude=./coverage",
  "--exclude=./playwright-report",
  "--exclude=./test-results",
  "--exclude=./.git",
  "--exclude=./.vscode",
  "--exclude=./.idea",
  "--exclude=./.env",
  "--exclude=./.env.local",
  "--exclude=./.env.*.local",
  # NOTE: cannot use `--exclude=./storage` — bsdtar treats it as a glob
  # and would also match `src/server/storage/` (a real source module).
  # Root-level `storage/` is a runtime-only PDF/upload cache that is
  # empty in the repo anyway. If it grows binary files, exclude them
  # via extensions instead.
  "--exclude=./storage/uploads",
  "--exclude=./deploy/payload-*.tar.gz",
  "--exclude=./tmp",
  "--exclude=./dist"
)
tar -czf $archive @excludes -C . .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
$size = (Get-Item $archive).Length
Ok "archive size: $([math]::Round($size/1MB, 2)) MiB"

$ssh = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new")

# ----- 2) upload -----------------------------------------------------------
Info "Uploading to ${User}@${RemoteHost}:/tmp/payload.tar.gz"
scp @ssh $archive "${User}@${RemoteHost}:/tmp/payload.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }
Ok "uploaded"

# ----- 3) remote unpack + kick off detached build --------------------------
Info "Unpacking on server + kicking off build (detached)"
$composeCmd = if ($SkipBuild) { 'docker compose up -d' } else { 'docker compose up -d --build' }
$remoteScriptPath = Join-Path (Split-Path -Parent $PSCommandPath) 'remote-deploy.sh'
# Read as raw bytes (avoids PowerShell's implicit trailing CRLF), strip
# any CR, and pipe LF-only bytes into `bash -s` on the server.
$rawScript = [IO.File]::ReadAllText($remoteScriptPath) -replace "`r", ""
$rawScriptBytes = [Text.Encoding]::UTF8.GetBytes($rawScript)
$tmpScript = Join-Path $env:TEMP "remote-deploy-$stamp.sh"
[IO.File]::WriteAllBytes($tmpScript, $rawScriptBytes)
try {
  cmd /c "type `"$tmpScript`" | ssh -i `"$KeyPath`" -o StrictHostKeyChecking=accept-new ${User}@${RemoteHost} `"REMOTE_DIR='$RemoteDir' COMPOSE_CMD='$composeCmd' bash -s`""
  if ($LASTEXITCODE -ne 0) { throw "remote unpack / build kickoff failed" }
} finally {
  Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue
}

# ----- 4) poll build log ---------------------------------------------------
# The detached build streams to /tmp/build.log; each poll is a short SSH
# call so we never sit through the full 7-min webpack silence in a
# single channel. `next build --webpack` writes "===BUILD-DONE===" as
# the very last line on success; docker/compose errors leave "ERROR" /
# "failed" markers that we surface immediately.
Info "Waiting for detached build (up to 25 min)"
$buildDeadline = (Get-Date).AddMinutes(25)
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
  Warn "build did not finish in 25 min - dumping tail for inspection"
  & ssh @ssh "${User}@${RemoteHost}" "tail -n 60 /tmp/build.log"
  throw "remote build timed out"
}

# ----- 5) prune + status --------------------------------------------------
Info "Pruning dangling images + printing compose status"
& ssh @ssh "${User}@${RemoteHost}" "cd $RemoteDir && docker image prune -f >/dev/null && docker compose ps"

# ----- 6) health poll -----------------------------------------------------
Info "Waiting for /api/health (up to 240s)"
$deadline = (Get-Date).AddSeconds(240)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "http://$RemoteHost/api/health" `
           -Headers @{ "Host" = "my.propertydesk.app" } `
           -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 5 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 5 }
}
if ($healthy) { Ok "app reports healthy" }
else { Warn "/api/health did not respond in time - check 'docker compose logs -f app'" }

Info "Cleaning local archive"
Remove-Item $archive -Force
Ok "done"

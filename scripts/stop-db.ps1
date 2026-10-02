# ==============================================================================
# CODEBREAK PostgreSQL 5433 Shutdown Helper
# Safely stops the local c:\event\pgdata PostgreSQL cluster running on port 5433
# ==============================================================================

$ErrorActionPreference = "Continue"

$pgData = (Resolve-Path (Join-Path $PSScriptRoot "..\pgdata")).Path

# Locate PostgreSQL binaries
$pgBinDirs = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin"
)

$binDir = $null
foreach ($dir in $pgBinDirs) {
    if (Test-Path (Join-Path $dir "pg_ctl.exe")) {
        $binDir = $dir
        break
    }
}

$pgCtl = if ($binDir) { Join-Path $binDir "pg_ctl.exe" } else { "pg_ctl.exe" }

$conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "[PostgreSQL] Port 5433 is not currently active."
    exit 0
}

Write-Host "[PostgreSQL] Stopping PostgreSQL cluster on port 5433..."

if (Test-Path $pgCtl) {
    & $pgCtl stop -D $pgData -m fast -w -t 20
}

# If port 5433 is still listening, stop owning process
$conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $pidToStop = $conn.OwningProcess
    Write-Host "[PostgreSQL] Stopping process PID $pidToStop on port 5433..."
    Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
}

# Verify it stopped
$timeout = 10
$elapsed = 0
$stopped = $false

while ($elapsed -lt $timeout) {
    $conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
    if (-not $conn) {
        $stopped = $true
        break
    }
    Start-Sleep -Milliseconds 500
    $elapsed += 0.5
}

if ($stopped) {
    Write-Host "[PostgreSQL] PostgreSQL cluster on port 5433 stopped cleanly."
} else {
    Write-Warning "[PostgreSQL] Port 5433 may still be in use."
}

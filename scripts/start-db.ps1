# ==============================================================================
# CODEBREAK PostgreSQL 5433 Startup Helper
# Ensures the local c:\event\pgdata PostgreSQL cluster is running on port 5433
# ==============================================================================

param(
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"

$pgData = (Resolve-Path (Join-Path $PSScriptRoot "..\pgdata")).Path

# 1. Check if port 5433 is already listening
$conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "[PostgreSQL] Cluster at $pgData is already active and listening on port 5433."
    exit 0
}

# 2. Check for stale postmaster.pid from an unclean shutdown
$pidFile = Join-Path $pgData "postmaster.pid"
if (Test-Path $pidFile) {
    try {
        $pidLine = (Get-Content $pidFile)[0]
        $stalePid = [int]$pidLine
        if (-not (Get-Process -Id $stalePid -ErrorAction SilentlyContinue)) {
            Write-Host "[PostgreSQL] Removing stale postmaster.pid (PID $stalePid is not running)..."
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Continue if file read/conversion fails
    }
}

# 3. Locate PostgreSQL binary
$pgBinDirs = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin"
)

$binDir = $null
foreach ($dir in $pgBinDirs) {
    if (Test-Path (Join-Path $dir "postgres.exe")) {
        $binDir = $dir
        break
    }
}

if (-not $binDir) {
    $cmd = Get-Command "postgres.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $binDir = Split-Path $cmd.Path
    } else {
        Write-Error "[PostgreSQL] PostgreSQL binary directory could not be found."
        exit 1
    }
}

$pgExe = Join-Path $binDir "postgres.exe"

if ($Foreground) {
    Write-Host "[PostgreSQL] Starting PostgreSQL cluster on port 5433 in foreground..."
    & $pgExe -D $pgData
} else {
    Write-Host "[PostgreSQL] Starting PostgreSQL cluster on port 5433 from $pgData in background..."
    Start-Process -FilePath $pgExe -ArgumentList "-D `"$pgData`"" -WindowStyle Hidden

    # Wait and verify port 5433 is listening
    $timeout = 15
    $elapsed = 0
    $started = $false

    while ($elapsed -lt $timeout) {
        $conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
        if ($conn) {
            $started = $true
            break
        }
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
    }

    if ($started) {
        Write-Host "[PostgreSQL] Success: PostgreSQL is listening on port 5433."
        exit 0
    } else {
        Write-Error "[PostgreSQL] Error: Timed out waiting for PostgreSQL to listen on port 5433."
        exit 1
    }
}

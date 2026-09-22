# Helper to ensure local postgres instance is running on port 5433
$pgData = Join-Path $PSScriptRoot "..\pgdata"
$pgExe = "C:\Program Files\PostgreSQL\18\bin\postgres.exe"

$conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "Starting PostgreSQL cluster on port 5433..."
    Start-Process -FilePath $pgExe -ArgumentList "-D `"$pgData`"" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "PostgreSQL started."
} else {
    Write-Host "PostgreSQL is already running on port 5433."
}

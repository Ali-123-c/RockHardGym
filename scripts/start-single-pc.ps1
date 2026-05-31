# Starts GymFlow app + fingerprint bridge in separate PowerShell windows (single-PC flow).
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root\.env.local")) {
  Write-Warning "Missing .env.local — copy .env.local.example and add Supabase + FINGERPRINT_API_KEY."
}

if (-not (Test-Path "$root\fingerprint-bridge\.env")) {
  Write-Warning "Missing fingerprint-bridge\.env — copy fingerprint-bridge\.env.example and set DEVICE_IP + DEVICE_ID."
}

Write-Host "Starting GymFlow on http://localhost:3000 ..."
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$root'; npm run dev"
)

Start-Sleep -Seconds 2

Write-Host "Starting fingerprint bridge on http://localhost:5050 ..."
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$root\fingerprint-bridge'; if (-not (Test-Path node_modules)) { npm install }; npm run dev"
)

Write-Host ""
Write-Host "Done. Open http://localhost:3000 and http://localhost:5050/health"
Write-Host "See SINGLE_PC_SETUP.md for device IP and DEVICE_ID configuration."

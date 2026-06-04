$processes = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "Killing PID: $($proc.OwningProcess)"
        Stop-Process -Id $proc.OwningProcess -Force
    }
    Start-Sleep 2
    $remaining = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "ERROR: Process still running on 5050"
    } else {
        Write-Host "SUCCESS: Port 5050 freed"
    }
} else {
    Write-Host "No process found on port 5050"
}

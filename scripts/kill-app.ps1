$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "Killing PID: $($proc.OwningProcess)"
        Stop-Process -Id $proc.OwningProcess -Force
    }
    Start-Sleep 2
    $remaining = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "ERROR: Process still running on 3000"
    } else {
        Write-Host "SUCCESS: Port 3000 freed"
    }
} else {
    Write-Host "No process found on port 3000"
}

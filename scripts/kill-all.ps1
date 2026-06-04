Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2
$remaining = Get-Process -Name node -ErrorAction SilentlyContinue
if ($remaining -ne $null -and $remaining.Count -gt 0) {
    Write-Host ($remaining.Count.ToString() + " node processes remaining")
} else {
    Write-Host "All node processes killed"
}

$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\igorp\Documents\enterall-smart-rx"
$logPath = Join-Path $projectRoot ".codex-cloudflared-current.log"
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

$existing = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 1
}

if (Test-Path $logPath) {
    Remove-Item $logPath -Force
}

Start-Process -FilePath $cloudflaredPath `
    -ArgumentList "tunnel", "--url", "http://127.0.0.1:3000", "--logfile", $logPath, "--protocol", "quic" `
    -WindowStyle Hidden

Write-Output $logPath

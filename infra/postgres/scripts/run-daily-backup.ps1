$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\igorp\Documents\enterall-smart-rx"
$backupScript = Join-Path $projectRoot "infra\postgres\scripts\backup.ps1"
$logDir = "C:\Backups\ENMeta\logs"
$logPath = Join-Path $logDir ("daily-backup-" + (Get-Date -Format "yyyyMMdd") + ".log")

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

try {
    & $backupScript *>&1 | Tee-Object -FilePath $logPath -Append
    Add-Content -LiteralPath $logPath -Value ("OK " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
} catch {
    Add-Content -LiteralPath $logPath -Value ("ERROR " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " " + $_.Exception.Message)
    throw
}

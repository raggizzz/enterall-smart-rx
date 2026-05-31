param(
    [string]$TaskName = "ENMeta Daily Backup",
    [string]$DailyTime = "20:00"
)

$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\igorp\Documents\enterall-smart-rx"
$backupScript = Join-Path $projectRoot "infra\postgres\scripts\run-daily-backup.ps1"

if (!(Test-Path $backupScript)) {
    throw "Script de backup nao encontrado: $backupScript"
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
$trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Backup diario do PostgreSQL ENMeta para disco local e OneDrive." `
    -Force | Out-Null

Write-Host "Tarefa '$TaskName' registrada para executar diariamente as $DailyTime."

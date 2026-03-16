param(
    [string]$OutputDir = "C:\Backups\ENMeta",
    [string]$ContainerName = "enterall-postgres",
    [string]$Database = "enterall_smart_rx",
    [string]$User = "enterall"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "enmeta-$timestamp.backup"
$containerPath = "/tmp/$fileName"
$hostPath = Join-Path $OutputDir $fileName

Write-Host "Gerando backup do PostgreSQL no container $ContainerName..."
docker exec $ContainerName pg_dump -U $User -d $Database -F c -f $containerPath

Write-Host "Copiando backup para $hostPath ..."
docker cp "${ContainerName}:$containerPath" $hostPath
docker exec $ContainerName rm -f $containerPath | Out-Null

Write-Host "Backup concluido em $hostPath"

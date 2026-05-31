param(
    [string]$OutputDir = "C:\Backups\ENMeta",
    [string]$MirrorDir = "",
    [string]$ContainerName = "enterall-postgres",
    [string]$Database = "enterall_smart_rx",
    [string]$User = "enterall",
    [int]$LocalRetentionDays = 30,
    [int]$MirrorRetentionDays = 90
)

$ErrorActionPreference = "Stop"

if (!$MirrorDir -and $env:OneDrive) {
    $MirrorDir = Join-Path $env:OneDrive "ENMeta Backups"
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    $dockerPath = $docker.Source
} else {
    $dockerPath = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
}

if (!(Test-Path $dockerPath)) {
    throw "Docker nao encontrado. Abra o Docker Desktop antes de executar o backup."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if ($MirrorDir) {
    New-Item -ItemType Directory -Force -Path $MirrorDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "enmeta-$timestamp.backup"
$containerPath = "/tmp/$fileName"
$hostPath = Join-Path $OutputDir $fileName

Write-Host "Gerando backup do PostgreSQL no container $ContainerName..."
& $dockerPath exec $ContainerName pg_dump -U $User -d $Database -F c -f $containerPath

Write-Host "Copiando backup para $hostPath ..."
& $dockerPath cp "${ContainerName}:$containerPath" $hostPath
& $dockerPath exec $ContainerName rm -f $containerPath | Out-Null

if ($MirrorDir) {
    $mirrorPath = Join-Path $MirrorDir $fileName
    Write-Host "Copiando backup para $mirrorPath ..."
    Copy-Item -LiteralPath $hostPath -Destination $mirrorPath
}

$localCutoff = (Get-Date).AddDays(-$LocalRetentionDays)
Get-ChildItem -LiteralPath $OutputDir -Filter "enmeta-*.backup" -File |
    Where-Object { $_.LastWriteTime -lt $localCutoff } |
    Remove-Item -Force

if ($MirrorDir) {
    $mirrorCutoff = (Get-Date).AddDays(-$MirrorRetentionDays)
    Get-ChildItem -LiteralPath $MirrorDir -Filter "enmeta-*.backup" -File |
        Where-Object { $_.LastWriteTime -lt $mirrorCutoff } |
        Remove-Item -Force
}

Write-Host "Backup concluido em $hostPath"

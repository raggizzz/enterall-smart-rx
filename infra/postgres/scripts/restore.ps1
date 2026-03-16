param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$ContainerName = "enterall-postgres",
    [string]$Database = "enterall_smart_rx",
    [string]$User = "enterall"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupFile)) {
    throw "Arquivo de backup nao encontrado: $BackupFile"
}

$fileName = Split-Path $BackupFile -Leaf
$containerPath = "/tmp/$fileName"

Write-Host "Copiando backup para o container..."
docker cp $BackupFile "${ContainerName}:$containerPath"

Write-Host "Restaurando banco $Database ..."
docker exec $ContainerName pg_restore -U $User -d $Database --clean --if-exists $containerPath
docker exec $ContainerName rm -f $containerPath | Out-Null

Write-Host "Restore concluido com sucesso."

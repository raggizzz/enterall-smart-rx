# Guia operacional do ENMeta com PWA, PostgreSQL e sincronizacao

## Visao geral

O fluxo recomendado no hospital e:

1. `PostgreSQL` rodando no PC dedicado
2. `backend` do ENMeta rodando no mesmo PC
3. `frontend/PWA` acessando o backend pela rede interna
4. cada aparelho usando o app instalado como PWA
5. se a rede cair, o aparelho grava localmente e sincroniza depois

## Enderecos padrao

- frontend local: `http://localhost:8080`
- backend local: `http://localhost:3000`
- healthcheck backend: `http://localhost:3000/health`
- readiness backend: `http://localhost:3000/health/ready`
- metrics backend: `http://localhost:3000/metrics`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Como iniciar tudo

### 1. Subir PostgreSQL e observabilidade

Na raiz do projeto:

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx
docker compose -f .\infra\postgres\docker-compose.yml up -d
```

### 2. Subir o backend

Em outro terminal:

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx\server
npm install
npx prisma db push
npm run dev
```

### 3. Subir o frontend

Em outro terminal:

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx
npm install
npm run dev
```

## Como validar rapidamente

### Backend

```powershell
curl http://localhost:3000/health
```

Resultado esperado:

```json
{"status":"ok","message":"EnterAll Smart RX Local Backend Running"}
```

### Frontend

Abrir:

```text
http://localhost:8080
```

## Como instalar como PWA

### Android

1. abrir a URL do frontend no Chrome
2. tocar em `Instalar app`
3. confirmar a instalacao

### iPhone

1. abrir no Safari
2. tocar em compartilhar
3. tocar em `Adicionar a Tela de Inicio`

## Como testar sincronizacao offline

### Teste simples

1. abrir o app
2. confirmar que o topo mostra `Sincronizado`
3. desligar a rede do aparelho ou desconectar do Wi-Fi
4. fazer um cadastro ou editar um registro
5. conferir no topo que surgiram `Pendentes`
6. abrir a `Central Sync`
7. religar a rede
8. tocar em `Sincronizar agora`
9. confirmar que os pendentes zeraram

### O que esperar

- offline: o dado fica salvo no aparelho
- online de novo: o dado sobe para a API e para o PostgreSQL
- se houver conflito: a operacao vai para `Falha de sync`

## Como tratar conflito de versao

Conflito acontece quando dois aparelhos mexem no mesmo registro e a versao local ficou antiga.

### Procedimento

1. abrir a `Central Sync`
2. localizar o item com `Falha`
3. revisar o endpoint e o erro
4. comparar com o registro atual no app
5. decidir:
   - `Descartar`, se a alteracao local nao deve subir
   - `Reenfileirar`, se voce ajustou o dado e quer tentar de novo

## Como monitorar o banco e a API

### Dashboards prontos

- `ENMeta - Backend`
- `ENMeta - PostgreSQL`

### PostgreSQL

- disponibilidade do processo
- conexoes ativas
- tempo de resposta
- volume de disco
- crescimento do WAL e dos backups

### App

- healthcheck do backend
- pendencias de sincronizacao
- falhas de sync
- erros 409 de conflito

## Como fazer backup

### Backup logico

```powershell
.\infra\postgres\scripts\backup.ps1
```

### Restore

```powershell
.\infra\postgres\scripts\restore.ps1 -BackupFile C:\Backups\ENMeta\enmeta-AAAAmmdd-HHmmss.backup
```

## Como atualizar schema

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx\server
npx prisma db push
```

## Como debugar a fila local

No app:

- olhar o badge do topo
- abrir `Central Sync`

No navegador:

1. abrir DevTools
2. ir em `Application`
3. abrir `IndexedDB`
4. procurar o banco `enmeta-offline`

Tabelas principais:

- `pendingOperations`
- `snapshots`
- `shadowRecords`
- `idMappings`

## O que a fila faz

- guarda operacoes de criacao, atualizacao e remocao
- usa `idempotency key` para evitar duplicacao
- usa `version` para detectar conflito
- mantem cache local da ultima leitura
- tenta sincronizar automaticamente quando a conexao volta

## Boas praticas de producao

- usar `UPS/no-break`
- deixar PostgreSQL e backend como servicos do sistema
- usar SSD
- testar restore de backup periodicamente
- monitorar espaco em disco
- documentar IP ou DNS interno do servidor do hospital

# Stack local de PostgreSQL e observabilidade

Esta pasta sobe uma stack local com:

- PostgreSQL 16
- `postgres_exporter`
- Prometheus
- Grafana OSS
- dashboards provisionados do ENMeta
- regras de alerta basicas

## Subir a stack

1. Copie `.env.example` para `.env`.
2. Ajuste as senhas.
3. Rode:

```powershell
docker compose -f infra/postgres/docker-compose.yml --env-file infra/postgres/.env up -d
```

## Enderecos padrao

- PostgreSQL: `localhost:5432`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Backend metrics: `http://localhost:3000/metrics`
- Backend readiness: `http://localhost:3000/health/ready`

## Dashboards provisionados

- `ENMeta - Backend`
- `ENMeta - PostgreSQL`

## Scripts operacionais

- backup: `infra/postgres/scripts/backup.ps1`
- restore: `infra/postgres/scripts/restore.ps1`
- checagem rapida da stack: `infra/postgres/scripts/check-stack.ps1`

## Observacao do host Windows

Para metricas do proprio PC hospitalar, instale tambem o `windows_exporter` no host.
Ele e gratuito e complementa o monitoramento de CPU, RAM, disco e rede da maquina.

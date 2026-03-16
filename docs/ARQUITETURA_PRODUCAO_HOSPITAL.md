# Arquitetura recomendada para producao local no hospital

## Recomendacao principal

Para uso 24h em ambiente hospitalar, a recomendacao e:

- app frontend no PC de uso
- backend Node local na rede interna
- PostgreSQL 16 como banco principal
- backup automatico diario com `pg_dump`
- monitoramento com Prometheus + Grafana + `postgres_exporter`
- no-break para o equipamento

## Topologias recomendadas

### Melhor opcao

- mini-servidor local ou VM Linux dentro do hospital
- PostgreSQL, backend e monitoramento rodando nessa maquina
- PCs da nutricao acessando pela rede interna

### Opcao aceitavel para comecar

- um unico PC dedicado 24h no hospital
- PostgreSQL como servico local
- backend local
- frontend acessando `localhost`

## O que observar gratis

- disponibilidade do backend
- disponibilidade do PostgreSQL
- CPU, memoria e disco do host
- uso de conexoes
- queries lentas
- locks
- crescimento do banco
- tempo de resposta do app
- sucesso e falha de backup

## Stack gratuita recomendada

- PostgreSQL
- `postgres_exporter`
- Prometheus
- Grafana OSS
- `windows_exporter` se o host for Windows

## Sinais de capacidade

Para este sistema, o limite pratico tende a vir antes da maquina e da operacao do que do PostgreSQL em si.
Com SSD, RAM adequada e monitoramento basico, um hospital de pequeno e medio porte tende a operar com folga.

Indicadores para acompanhar:

- CPU sustentada acima de 70%
- uso de memoria no host
- latencia de disco
- conexoes simultaneas
- queries com aumento de latencia
- tamanho e tempo de backup

## Backup recomendado

- `pg_dump` diario
- copia local retida por 7 a 30 dias
- copia secundaria em pasta externa ou outro equipamento interno
- teste de restauracao periodico

## Runbook minimo

### Diario

- verificar se backend e banco estao no ar
- verificar se o backup do dia rodou

### Semanal

- verificar uso de disco
- verificar crescimento do banco
- revisar alertas do Grafana/Prometheus

### Mensal

- restaurar um backup em ambiente de teste
- revisar espaco, logs e performance

## Migracao sugerida

1. Exportar backup JSON no ambiente atual.
2. Subir PostgreSQL.
3. Ajustar `DATABASE_URL`.
4. Rodar `npm run db:push` na pasta `server`.
5. Importar o backup com `npm run backup:import -- <arquivo.json>`.
6. Validar pacientes, formulas, prescricoes e relatorios.
7. Virar a operacao para o novo banco.

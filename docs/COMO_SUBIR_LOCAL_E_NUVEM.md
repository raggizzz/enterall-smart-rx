# Como subir localmente e na nuvem

## 1. Requisitos

- Windows com PowerShell
- Node.js 20+
- Docker Desktop
- Porta `8080` livre para o frontend
- Porta `3000` livre para o backend
- Porta `5432` livre para o PostgreSQL

## 2. Abrir o projeto

No PowerShell:

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx
```

## 3. Subir o banco com Docker

Abrir o Docker Desktop e esperar ficar com status `Engine running`.

Se for a primeira vez:

```powershell
Copy-Item infra\postgres\.env.example infra\postgres\.env
```

Depois subir a stack:

```powershell
docker compose -f infra/postgres/docker-compose.yml --env-file infra/postgres/.env up -d
```

Isso sobe:

- PostgreSQL em `localhost:5432`
- Prometheus em `http://localhost:9090`
- Grafana em `http://localhost:3001`

Para conferir:

```powershell
docker ps
```

## 4. Configurar backend

Ir para a pasta do servidor:

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx\server
```

Se quiser usar PostgreSQL local:

```powershell
Copy-Item .env.postgres.example .env
```

Ajustar a senha do `.env` se tiver trocado no `infra\postgres\.env`.

Exemplo esperado:

```env
DATABASE_URL="postgresql://enterall:SUA_SENHA@localhost:5432/enterall_smart_rx?schema=public"
PORT=3000
```

Instalar dependências se necessário:

```powershell
npm install
```

Criar/atualizar as tabelas:

```powershell
npm run db:generate
npm run db:push
```

Subir o backend:

```powershell
npm run dev
```

Saúde do backend:

- `http://localhost:3000/health`
- `http://localhost:3000/health/ready`
- `http://localhost:3000/metrics`

## 5. Subir o frontend

Em outro PowerShell:

```powershell
cd C:\Users\igorp\Documents\enterall-smart-rx
npm install
npm run dev
```

Frontend:

- `http://localhost:8080`

O frontend fala com o backend em:

- `http://localhost:3000/api`

## 6. Ordem certa para abrir tudo

1. Abrir o Docker Desktop
2. Subir a stack do banco
3. Subir o backend
4. Subir o frontend
5. Abrir `http://localhost:8080`

## 7. Como parar tudo

Frontend e backend:

- `Ctrl + C` em cada terminal

Banco via Docker:

```powershell
docker compose -f infra/postgres/docker-compose.yml --env-file infra/postgres/.env down
```

## 8. Portas usadas

- `8080`: frontend
- `3000`: backend
- `5432`: PostgreSQL
- `9090`: Prometheus
- `3001`: Grafana
- `9187`: postgres exporter

## 9. Problemas comuns

### Backend não sobe

Conferir:

```powershell
docker ps
```

Se o PostgreSQL não estiver rodando, subir de novo:

```powershell
docker compose -f infra/postgres/docker-compose.yml --env-file infra/postgres/.env up -d
```

### Frontend abre, mas API dá erro 500

Normalmente o banco não subiu ou o backend não conectou no PostgreSQL.

Testar:

```powershell
Invoke-RestMethod http://localhost:3000/health/ready
```

### Tela mostra dados antigos

O app usa cache/PWA. Fazer:

- `Ctrl + F5`

## 10. Subir grátis na nuvem para teste

Como a produção final vai rodar em máquina 24h, o melhor caminho grátis para demonstração é:

### Opção 1: Frontend no Vercel + backend/banco local

Bom para mostrar interface.

- subir só o frontend no Vercel
- configurar `VITE_API_URL` apontando para o backend exposto da sua máquina
- expor a porta `3000` com Cloudflare Tunnel ou ngrok

Vantagem:

- grátis e rápido

Limitação:

- depende da sua máquina ligada

### Opção 2: Frontend no Vercel + backend no Render + banco no Neon

Bom para um teste mais completo sem depender tanto do PC.

- frontend: Vercel
- backend Node: Render
- PostgreSQL: Neon

Vantagem:

- tudo online

Limitação:

- planos grátis podem dormir por inatividade

### Opção 3: Tudo local com túnel público

Mais simples para demo curta.

- manter frontend `8080` e backend `3000` na sua máquina
- expor com Cloudflare Tunnel

Vantagem:

- sem mexer muito no projeto

Limitação:

- depende 100% da sua máquina ficar ligada

## 11. Recomendação prática para amanhã

Se for só para seu amigo mexer:

1. clonar o projeto
2. abrir Docker Desktop
3. subir o PostgreSQL com Docker
4. subir backend em `3000`
5. subir frontend em `8080`

Se for para o cliente testar pela internet sem custo:

1. colocar frontend no Vercel
2. expor o backend local com Cloudflare Tunnel
3. manter a máquina ligada


# ENMeta: prontidao para producao

## Estado verificado

- Frontend: `npm.cmd run build` passa.
- Lint: passa sem erros; os avisos existentes de `any` e hooks continuam pendentes.
- Calculos clinicos: smoke test automatizado passa para Ireton-Jones, Harris-Benedict, formula de bolso, balanco nitrogenado, Chumlea e DVA.
- Prisma: schema valido e cliente gerado.
- Banco local: indisponivel quando o Docker Desktop nao esta com o daemon Linux ativo.
- Producao: o `vercel.json` ainda aponta para um dominio temporario `trycloudflare.com`. Isso nao e uma arquitetura de disponibilidade; quando o notebook ou o processo do tunel cai, a API retorna erro 502.

## Arquitetura necessaria

1. Hospedar o backend em um servico permanente com HTTPS, health check e restart automatico.
2. Hospedar o PostgreSQL em uma instancia persistente com backup diario e retencao.
3. Configurar o frontend com `VITE_API_URL` apontando para o backend permanente.
4. Remover os rewrites para o tunel temporario depois de validar `/health`, `/health/ready`, login e uma gravacao real.
5. Executar as migracoes Prisma no banco permanente antes de liberar a versao.

## Banco e historico

`DailyEvolution` agora possui uma chave unica composta por hospital, paciente e data. Antes de aplicar a migracao em uma base que ja tenha dados, verificar duplicidades:

```sql
SELECT "hospitalId", "patientId", "date", COUNT(*)
FROM "DailyEvolution"
GROUP BY "hospitalId", "patientId", "date"
HAVING COUNT(*) > 1;
```

Depois da limpeza supervisionada, aplicar:

```powershell
Push-Location server
npx.cmd prisma migrate deploy
Pop-Location
```

O endpoint de evolucao usa `upsert` nessa chave. Isso torna a sincronizacao idempotente para a mesma data operacional.

## Offline

- Cadastros e alteracoes sao gravados no IndexedDB e entram na fila local quando a rede ou o servidor falha.
- A fila usa idempotencia, identificador do dispositivo e reconciliacao de IDs temporarios.
- A lista de hospitais permanece disponivel offline quando foi carregada anteriormente; a correcao evita substituir o cache por uma lista vazia quando a API falha.
- O login inicial continua exigindo validacao do servidor. Liberar senha offline seria um bypass de autenticacao. O fluxo offline completo deve ser usado depois de uma sessao validada, com banner claro de pendencias.

## Datas operacionais

O acompanhamento grava o dia clinico encerrado, isto e, o dia anterior local. A regra esta centralizada em `getClinicalMonitoringDateKey`. Horarios de dieta seguem a virada operacional configurada em `scheduleTimes.ts`; os relatorios devem receber a mesma data operacional, nunca uma data calculada diretamente pelo relogio da tela.

## Calculos clinicos

As tres estimativas de gasto energetico compartilham agora o mesmo modulo. A ferramenta nao aplica fator de atividade, trauma ou queimadura. A formula de bolso recebe kcal/kg do usuario. O balanco nitrogenado exibe apenas equilibrio, anabolismo ou catabolismo.

Os coeficientes atualmente implementados foram conferidos contra `Ferramentas do app (1).xlsx`: Chumlea simplificada para peso/estatura, Ireton-Jones sem trauma/queimadura conforme a decisao funcional mais recente, Harris-Benedict, formula de bolso, balanco nitrogenado e DVA. A planilha ainda contem os fatores legados de trauma/queimadura; eles permanecem fora da tela porque a especificacao posterior pediu que nao fossem usados.

O GIDS segue as faixas da planilha, incluindo os cinco resultados: 0 sem risco, 1 risco aumentado, 2 disfuncao gastrointestinal, 3 falencia gastrointestinal e 4 ameaca a vida. A regra da planilha para dois sintomas leves sem dieta oral e ambigua (aparece nas faixas 1 e 2); o app adota a classificacao conservadora na faixa 2.

As perdas adicionais do balanco nitrogenado agora sao selecionadas pelas quatro categorias da planilha: constipacao (3 g/dia), funcao intestinal normal (4 g/dia), diarreia (5 g/dia) e fistula (8 g/dia). Intercorrencias do dialogo de acompanhamento ficam em `tneInterruptions`; a observacao clinica permanece limitada a 55 caracteres.

## Relatorios e po

Quantidade de po permanece em gramas. Volume final so aparece em mL quando existe `diluteTo` configurado. O sistema nao subtrai gramas de um volume em mL para estimar agua livre. Isso evita a classe de erro que fazia `30 g` aparecer como `30 mL`.

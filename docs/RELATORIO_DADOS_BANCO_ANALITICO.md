# Relatorio tecnico: dados, banco de dados e uso analitico

Este documento descreve como o ENMeta / EnterAll Smart RX armazena os dados, quais informacoes sao cadastradas, como elas se relacionam e como podem ser usadas depois para relatorios gerenciais, consumo de dietas, planejamento de compras e embasamento de quantitativos para contratos.

## 1. Onde os dados ficam armazenados

O sistema usa um banco de dados PostgreSQL. O schema do banco esta definido no projeto em `server/prisma/schema.prisma`.

Na instalacao local atual, o PostgreSQL foi iniciado no proprio computador que esta servindo o backend. Nesta maquina, os arquivos fisicos do banco ficam em:

```text
/home/raggi/.local/share/enterall-pg
```

Em producao com notebook da cliente, o conceito e o mesmo: o frontend publicado na Vercel acessa o backend local pelo tunel, e o backend local grava no PostgreSQL instalado no notebook/servidor da cliente. Portanto, se a arquitetura continuar local, os dados ficam no equipamento da cliente.

Ponto importante: o codigo do sistema contem a estrutura do banco, mas nao contem os dados reais. Se um computador antigo for formatado sem backup do PostgreSQL, os dados antigos daquele banco nao sao recuperados apenas pelo codigo.

## 2. Como os dados sao cadastrados

O cadastro acontece em camadas:

1. O usuario acessa o frontend.
2. O frontend chama a API do backend Express.
3. O backend valida permissao, hospital da sessao e dados recebidos.
4. O backend grava no PostgreSQL usando Prisma.

Cada usuario logado possui um hospital ativo na sessao. Quase todos os dados assistenciais e de consumo ficam vinculados a um `hospitalId`. Isso permite separar as informacoes por unidade.

## 3. Principais dados cadastrados

### Unidade hospitalar

Tabela: `Hospital`

Armazena as unidades/hospitais cadastrados. Campos principais:

- `id`: identificador unico.
- `name`: nome da unidade.
- `cnpj`, `address`, `city`, `state`, `phone`, `email`: dados cadastrais opcionais.
- `isActive`: indica se a unidade esta ativa.
- `createdAt`, `updatedAt`: auditoria de criacao e atualizacao.

Uso analitico: filtrar relatorios por hospital, comparar consumo entre unidades, separar contratos por unidade.

### Alas, setores e leitos

Tabela: `Ward`

Armazena setores vinculados a um hospital. Campos principais:

- `hospitalId`: unidade a qual o setor pertence.
- `name`: nome do setor.
- `type`: tipo de setor, como UTI, enfermaria ou emergencia.
- `bedCount`: quantidade de leitos.
- `defaultSchedules`: horarios padrao.

Uso analitico: consumo por ala, custo por setor, numero de pacientes-dia por setor.

### Profissionais

Tabela: `Professional`

Armazena usuarios/profissionais do sistema. Campos principais:

- `hospitalId`: unidade do profissional, quando aplicavel.
- `name`: nome.
- `role`: perfil, como `general_manager`, `local_manager`, `nutritionist`, `technician`.
- `registrationNumber`: matricula/registro usado no login.
- `passwordHash`: senha criptografada. A senha em texto puro nao fica salva.
- `isActive`: ativo/inativo.

Uso analitico: autoria de prescricoes e evolucoes, rastreabilidade operacional.

### Pacientes

Tabela: `Patient`

Armazena pacientes cadastrados. Campos principais:

- `hospitalId`: hospital do paciente.
- `wardId`: setor/ala.
- `name`: nome do paciente.
- `bed`: leito.
- `recordNumber`: prontuario.
- `admissionDate`, `birthDate`, `gender`: dados de internacao e identificacao.
- `weight`, `height`, `bmi`: dados antropometricos.
- `diagnosis`, `comorbidities`, `allergies`: dados clinicos.
- `nutritionType`: via nutricional predominante.
- `status`: ativo, alta, transferencia, obito.

Uso analitico: numero de pacientes atendidos, pacientes-dia, perfil clinico, consumo por paciente, consumo por ala.

### Formulas, modulos e insumos

Tabelas: `Formula`, `Module`, `Supply`

`Formula` armazena dietas/formulas nutricionais:

- nome, codigo, fabricante, tipo, classificacao.
- densidade calorica, calorias, proteina, carboidrato, gordura, fibra.
- unidade de faturamento, preco, apresentacoes.
- dados ambientais opcionais: plastico, papel, metal, vidro.

`Module` armazena modulos nutricionais:

- nome, fabricante, densidade, referencia, calorias, proteina, sodio, potassio, fibras.
- preco e unidade de faturamento.

`Supply` armazena materiais/insumos:

- equipo, frasco, bomba, agua, seringa, materiais auxiliares.
- preco unitario, unidade de faturamento, capacidade e categoria.

Uso analitico: ranking de consumo, custo por produto, estimativa de contrato, residuos por produto.

### Prescricoes

Tabela principal: `Prescription`

Tabelas de itens:

- `PrescriptionFormula`
- `PrescriptionModule`
- `PrescriptionSupply`

A prescricao guarda a terapia indicada ao paciente:

- `hospitalId`, `patientId`, `professionalId`.
- `therapyType`: oral, enteral ou parenteral.
- `systemType`: sistema aberto ou fechado.
- `infusionMode`: bomba, gravitacional, bolus etc.
- `totalCalories`, `totalProtein`, `totalVolume`, `totalCost`.
- `startDate`, `endDate`, `status`.
- snapshots de detalhes da prescricao.

Os itens da prescricao guardam:

- formula prescrita.
- volume por horario.
- quantidade de vezes ao dia.
- horarios.
- modulos prescritos.
- insumos relacionados.

Uso analitico: este e o nucleo para calcular saida de dietas, volume prescrito, numero de prescricoes, custo estimado, consumo por periodo e planejamento de contrato.

### Evolucao diaria

Tabela: `DailyEvolution`

Armazena o acompanhamento diario do paciente:

- `date`: dia da evolucao.
- `prescribedVolume`: volume prescrito.
- `infusedVolume`: volume realmente infundido.
- `infusionPercentage`: percentual infundido.
- calorias/proteina por via.
- interrupcoes da TNE.
- glicemia, vomitos, evacuacoes, residuos, peso e observacoes.

Uso analitico: diferenciar o que foi prescrito do que foi realmente administrado. Para contrato e compra, isso permite trabalhar com dois cenarios: demanda prescrita e consumo efetivo.

## 4. Como ver quais dietas tem mais saida

Existem duas formas principais:

1. Saida prescrita: calcula o volume previsto a partir das prescricoes.
2. Saida efetiva: usa evolucao diaria para considerar volume realmente infundido.

Para contrato, normalmente e util apresentar os dois:

- `Prescrito`: mostra demanda planejada pela equipe.
- `Infundido`: mostra consumo assistencial realizado.
- `Diferenca`: ajuda a justificar perdas, interrupcoes, suspensoes e ajustes.

Exemplo de indicadores:

- volume total por formula no periodo.
- quantidade estimada de frascos/bolsas.
- custo total por formula.
- custo medio por paciente-dia.
- ranking das formulas mais usadas.
- consumo por ala.
- consumo por tipo de terapia.
- quantidade de pacientes atendidos.
- quantidade de prescricoes ativas no periodo.

## 5. Como embasar quantitativo para proximos contratos

O banco permite montar uma base historica por periodo. Um fluxo recomendado:

1. Selecionar periodo historico, por exemplo ultimos 3, 6 ou 12 meses.
2. Filtrar hospital e, se necessario, ala/setor.
3. Somar consumo por produto.
4. Calcular media mensal.
5. Calcular media por paciente-dia.
6. Aplicar margem tecnica para perdas, variacao de ocupacao e sazonalidade.
7. Projetar quantitativo para o periodo contratual.

Exemplo:

```text
Formula A consumiu 18.000 mL em 30 dias.
Media diaria: 600 mL/dia.
Contrato de 180 dias: 108.000 mL.
Margem tecnica de 15%: 124.200 mL.
Se embalagem tem 1.000 mL: 125 unidades estimadas.
```

## 6. Arquivos de exemplo

Foram criados arquivos ficticios em `docs/` para demonstrar o formato que pode ser enviado/exportado:

- `docs/exemplo_consumo_produtos_periodo.csv`
- `docs/exemplo_prescricoes_periodo.csv`
- `docs/exemplo_evolucao_diaria.csv`
- `docs/exemplo_relatorio_gestao.xml`
- `docs/consultas_analiticas_exemplo.sql`

Esses arquivos nao contem dados reais de paciente. Servem apenas como modelo de estrutura.

## 7. Como trabalhar com os dados depois

As opcoes praticas sao:

### Pelo proprio sistema

A tela de relatorios ja usa prescricoes, evolucoes, formulas, modulos e insumos para gerar indicadores de consumo, custo e acompanhamento.

### Por exportacao CSV/XML

Os dados podem ser exportados para Excel, Power BI, Google Sheets ou sistema administrativo da instituicao.

CSV e indicado para planilhas e Power BI.

XML e indicado quando a instituicao pede arquivo estruturado para integracao.

### Por consulta SQL

Como o banco e PostgreSQL, e possivel criar consultas SQL diretamente para relatorios personalizados. O arquivo `docs/consultas_analiticas_exemplo.sql` contem exemplos de consultas.

### Por backup do banco

Para seguranca e continuidade, deve existir rotina de backup. Exemplo:

```bash
pg_dump -h 127.0.0.1 -p 5432 -U enterall -d enterall_smart_rx -F c -f backup-enterall-smart-rx.dump
```

Esse arquivo de backup permite restaurar os dados em outro computador.

## 8. Pontos de seguranca e LGPD

O banco pode conter dados pessoais e dados sensiveis de saude. Portanto:

- deve haver backup controlado.
- o computador servidor precisa ter usuario/senha.
- o acesso ao sistema deve ser por perfis.
- senha de usuario nao deve ser armazenada em texto puro.
- exportacoes com nome de paciente devem ser tratadas como documento sensivel.
- para demonstracoes comerciais, usar dados ficticios ou anonimizados.

## 9. Resposta curta para questionamento da cliente

Os dados ficam armazenados em banco PostgreSQL, separados por hospital/unidade. O sistema registra cadastro de pacientes, setores, profissionais, formulas, modulos, insumos, prescricoes e evolucoes diarias. A partir desses registros, e possivel gerar relatorios de consumo por dieta, custo por produto, paciente-dia, volume prescrito, volume infundido e estimativas para contratos futuros. Os dados podem ser exportados em CSV/XML ou consultados diretamente por SQL/BI, desde que respeitadas as regras de seguranca e LGPD.

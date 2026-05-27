# Arquitetura, Casos de Uso e Fluxos do Aplicativo

## 1. Visão Geral do Sistema

O aplicativo **EnterAll Smart RX / ENMeta** foi desenvolvido como uma aplicação web responsiva, com suporte à instalação em dispositivos móveis no formato **Progressive Web App (PWA)**. Essa abordagem permite sua utilização em smartphones, tablets e computadores por meio de navegadores modernos, mantendo uma única base tecnológica para os diferentes contextos de uso.

Do ponto de vista arquitetural, o sistema foi construído em modelo **cliente-servidor**. A camada de interface foi implementada com **React 18** e **TypeScript**, utilizando **Vite** como ferramenta de desenvolvimento e empacotamento. A camada de backend foi desenvolvida em **Node.js**, com **Express** e **TypeScript**, sendo responsável pela autenticação, controle de permissões, regras de negócio e acesso ao banco de dados. Para persistência relacional foi utilizado **PostgreSQL**, com mediação do ORM **Prisma**.

Além da persistência principal no servidor, a aplicação dispõe de uma camada de persistência local de apoio no navegador, por meio de **IndexedDB**, acessado com a biblioteca **Dexie**. Essa camada permite manter informações locais, armazenar filas de sincronização pendente e sustentar o comportamento da aplicação em cenários de conectividade instável.

Em ambiente de produção, o frontend é publicado na **Vercel**, enquanto o backend é disponibilizado por serviço HTTP próprio. Para testes locais e operação controlada, o backend e o banco de dados podem ser executados em conjunto com contêineres **Docker**. O idioma padrão da interface é **português do Brasil**.

## 2. Perfis de Usuário

O sistema foi estruturado com controle de acesso baseado em perfis. Os perfis atualmente identificados na aplicação são:

- **Gestor geral**: possui acesso amplo às funcionalidades administrativas, assistenciais, operacionais e gerenciais.
- **Gestor local**: atua no gerenciamento da unidade hospitalar, incluindo alas, profissionais, permissões locais, custos e cadastros operacionais.
- **Nutricionista**: realiza o cadastro e acompanhamento de pacientes, prescrição nutricional, geração de documentos operacionais, uso de ferramentas clínicas e consulta a relatórios.
- **Técnico**: atua principalmente na operação, especialmente em etiquetas, mapa da dieta oral, protocolo de entrega, requisições e cancelamentos técnicos.

O controle de acesso é implementado no frontend e no backend, garantindo que cada perfil visualize apenas as funcionalidades compatíveis com suas permissões.

## 3. Módulos Funcionais do Aplicativo

O aplicativo foi organizado em módulos funcionais integrados:

### 3.1 Autenticação e Sessão

Esse módulo é responsável pelo login do usuário, controle da sessão ativa, renovação de autenticação e definição do contexto da unidade hospitalar em uso. O sistema utiliza autenticação baseada em **JWT**, com controle de sessão no navegador.

### 3.2 Configurações e Gestão

O módulo de configurações concentra as funcionalidades de administração do sistema, incluindo:

- cadastro e edição de unidades hospitalares;
- cadastro e edição de alas/setores;
- definição de horários padrão de administração por ala;
- cadastro de profissionais;
- configuração de perfis e permissões;
- parametrização de custos;
- definição de assinaturas padrão;
- configuração de etiquetas;
- exportação e importação de backup;
- cadastro de links e ferramentas de apoio.

### 3.3 Cadastros Básicos

O sistema possui módulos específicos para gerenciamento de:

- pacientes;
- fórmulas;
- módulos;
- insumos;
- profissionais.

Esses cadastros alimentam os demais fluxos assistenciais, operacionais e gerenciais.

### 3.4 Prescrição Nutricional

O núcleo assistencial do aplicativo encontra-se no módulo de prescrição, que permite a construção de prescrições nutricionais por tipo de terapia:

- **terapia oral**;
- **terapia enteral**;
- **terapia parenteral**.

No caso da terapia enteral, o sistema suporta:

- seleção de fórmulas;
- escolha entre sistema aberto ou fechado;
- definição de via de administração;
- configuração de volume, diluição, velocidade e modo de infusão;
- distribuição por horários;
- adição de módulos;
- definição de hidratação;
- cálculo nutricional consolidado;
- aplicação de horários padrão da ala e, quando pertinente, padrões do paciente.

No caso da terapia parenteral, o sistema contempla parâmetros de composição, volume, tempo de infusão e cálculos derivados, como indicadores relacionados à glicose. Na terapia oral, contempla consistência, refeições, suplementos, espessantes e parâmetros de prescrição associados.

### 3.5 Acompanhamento Clínico e Evolução

O módulo de acompanhamento foi projetado para registrar a execução clínica da terapia nutricional ao longo do tempo. Entre as funcionalidades presentes estão:

- seleção de paciente e data;
- identificação da prescrição ativa do período;
- registro do volume prescrito e efetivamente infundido;
- cálculo do percentual de dieta enteral infundida em relação ao prescrito;
- registro de interrupções da terapia nutricional enteral;
- registro de intercorrências;
- registro de calorias não intencionais;
- armazenamento do histórico assistencial.

As informações desse módulo alimentam diretamente os relatórios e os indicadores do paciente.

### 3.6 Operação Assistencial

Esse módulo reúne as funcionalidades voltadas à execução operacional da terapia nutricional:

- geração de etiquetas clínicas;
- geração do mapa da dieta oral;
- geração de requisição de insumos;
- protocolo de entrega;
- cancelamento técnico;
- requisição extra manual.

As saídas operacionais são produzidas a partir das prescrições ativas, dos filtros por período, unidade, tipo de terapia e horários selecionados.

### 3.7 Relatórios

O módulo de relatórios contempla diferentes perspectivas analíticas:

- gestão;
- histórico assistencial;
- consumo no período;
- comparação por produto;
- resíduos recicláveis.

Os relatórios consolidam dados clínicos, operacionais e econômicos do sistema.

### 3.8 Ferramentas Clínicas

O aplicativo possui ainda um módulo de ferramentas e calculadoras clínicas, voltado ao apoio à decisão nutricional.

### 3.9 Sincronização e Operação Offline

Uma característica importante do sistema é a existência de uma camada local de sincronização. Quando há falha de conexão ou indisponibilidade momentânea do backend, determinadas operações podem ser registradas localmente e enfileiradas para sincronização posterior. O sistema também possui uma central de sincronização para:

- visualizar pendências;
- reenfileirar operações;
- descartar itens;
- tratar conflitos de versão;
- forçar atualização dos dados atuais da unidade.

## 4. Arquitetura Tecnológica

### 4.1 Frontend

O frontend foi desenvolvido com:

- **React 18**
- **TypeScript**
- **Vite**
- **React Router**
- **TanStack React Query**
- **Tailwind CSS**
- **Radix UI**

Essa camada é responsável pela renderização das telas, gestão de estado da interface, navegação protegida por permissões e comunicação com o backend.

### 4.2 Persistência Local

Para suporte local foram utilizados:

- **IndexedDB**
- **Dexie**
- **Dexie React Hooks**

Essa estrutura permite manter dados locais de apoio e operar com fila de sincronização.

### 4.3 Backend

O backend foi desenvolvido com:

- **Node.js**
- **Express**
- **TypeScript**
- **JWT**
- **Zod**

Essa camada centraliza autenticação, autorização, regras de negócio e integração com o banco de dados.

### 4.4 Banco de Dados

O banco de dados principal adotado foi o **PostgreSQL**, com modelagem de entidades como:

- hospitais;
- alas;
- profissionais;
- pacientes;
- fórmulas;
- módulos;
- insumos;
- prescrições;
- evoluções diárias;
- configurações da aplicação;
- permissões por perfil.

O acesso ao banco é mediado pelo **Prisma ORM**.

## 5. Descrição dos Fluxos Principais

### 5.1 Fluxo Geral do Sistema

De modo geral, o funcionamento do sistema segue a sequência:

1. autenticação do usuário;
2. identificação do perfil e da unidade;
3. liberação dos módulos conforme permissões;
4. uso dos cadastros e parâmetros institucionais;
5. cadastro e acompanhamento de pacientes;
6. elaboração da prescrição nutricional;
7. geração das saídas operacionais;
8. registro do acompanhamento clínico;
9. consolidação em relatórios.

### 5.2 Fluxo de Prescrição

O fluxo de prescrição envolve:

1. seleção do paciente;
2. recuperação da situação clínica atual;
3. escolha da terapia nutricional;
4. parametrização da prescrição;
5. cálculo dos totais nutricionais;
6. validação de regras clínicas e operacionais;
7. salvamento da prescrição;
8. atualização da via ativa do paciente.

### 5.3 Fluxo de Acompanhamento

O acompanhamento envolve:

1. escolha do paciente e da data;
2. recuperação da prescrição correspondente;
3. registro do volume prescrito e executado;
4. registro de interrupções e intercorrências;
5. cálculo do percentual de adequação;
6. salvamento da evolução diária;
7. atualização do histórico assistencial e dos relatórios.

### 5.4 Fluxo Operacional

No plano operacional, a partir das prescrições ativas, o sistema permite:

1. consolidar fórmulas, módulos e insumos;
2. gerar requisições;
3. emitir protocolo de entrega;
4. imprimir etiquetas;
5. gerar cancelamentos técnicos e requisições extras.

### 5.5 Fluxo de Relatórios

Os relatórios são construídos a partir da consolidação dos dados clínicos, operacionais e econômicos já registrados no sistema. Dessa forma, o sistema integra atividades assistenciais, logísticas e gerenciais em um único ambiente computacional.

## 6. Considerações Finais

Do ponto de vista de arquitetura de software, o aplicativo foi concebido como uma plataforma integrada para apoio à terapia nutricional, reunindo em um mesmo sistema funções de cadastro, prescrição, monitoramento, operação e gestão. Essa organização permite rastreabilidade das informações, padronização dos processos e apoio à tomada de decisão clínica e administrativa.

## 7. Referência aos Diagramas

Os diagramas complementares deste documento encontram-se nos arquivos:

- `diagrama-arquitetura-geral.mmd`
- `diagrama-casos-de-uso-completo.mmd`
- `fluxograma-geral-do-sistema.mmd`
- `fluxograma-prescricao-nutricional.mmd`
- `fluxograma-acompanhamento-nutricional.mmd`
- `fluxograma-operacao-faturamento.mmd`

Esses arquivos podem ser abertos em editores compatíveis com **Mermaid** ou convertidos posteriormente para imagens e figuras para inserção na dissertação.

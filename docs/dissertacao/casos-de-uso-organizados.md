# Casos de Uso Organizados do Sistema

## 1. Atores do Sistema

Os atores principais identificados no aplicativo são:

- **Gestor geral**
- **Gestor local**
- **Nutricionista**
- **Técnico**

## 2. Organização dos Casos de Uso por Macroprocesso

Para facilitar a compreensão funcional do sistema, os casos de uso foram agrupados em macroprocessos.

### 2.1 Acesso e Contexto de Trabalho

- Autenticar-se no sistema
- Selecionar unidade e contexto de trabalho
- Renovar sessão de uso
- Consultar central de sincronização
- Sincronizar pendências offline

**Perfis envolvidos:** gestor geral, gestor local, nutricionista, técnico.

### 2.2 Gestão Institucional

- Gerenciar unidades hospitalares
- Gerenciar alas/setores
- Definir horários padrão por ala/unidade
- Gerenciar perfis e permissões
- Cadastrar profissionais
- Configurar custos e parâmetros
- Exportar/importar backup

**Perfis envolvidos:** gestor geral e gestor local.

### 2.3 Cadastros Assistenciais e Operacionais

- Cadastrar e editar pacientes
- Mover pacientes entre alas
- Cadastrar fórmulas
- Cadastrar módulos
- Cadastrar insumos

**Perfis envolvidos:**  
- gestores: pacientes, fórmulas, módulos, insumos;  
- nutricionista: pacientes;  
- técnico: sem atuação principal nesse conjunto.

### 2.4 Prescrição Nutricional

- Criar prescrição nutricional
- Prescrever terapia enteral
- Prescrever terapia oral
- Prescrever terapia parenteral
- Salvar padrão de horários por paciente

**Perfis envolvidos:** gestor geral, gestor local e nutricionista.

### 2.5 Monitoramento e Evolução

- Registrar evolução diária
- Registrar volume infundido e interrupções
- Consolidar histórico assistencial

**Perfis envolvidos:** gestor geral, gestor local e nutricionista.

### 2.6 Operação Assistencial

- Gerar etiquetas
- Gerar mapa da dieta oral
- Gerar requisição/faturamento
- Emitir protocolo de entrega
- Emitir cancelamento técnico

**Perfis envolvidos:**  
- gestor geral;  
- gestor local;  
- nutricionista;  
- técnico, com foco operacional em etiquetas, mapa da dieta oral, requisições, protocolo e cancelamentos.

### 2.7 Relatórios e Apoio à Decisão

- Visualizar relatórios gerenciais
- Usar calculadoras clínicas
- Utilizar ferramentas nutricionais de apoio

**Perfis envolvidos:** gestor geral, gestor local e nutricionista.

## 3. Organização dos Casos de Uso por Perfil

### 3.1 Gestor Geral

O gestor geral possui a visão mais ampla do sistema, sendo responsável por:

- autenticação e acesso à unidade;
- gestão de unidades hospitalares;
- gestão de alas e horários padrão;
- gestão de perfis e permissões;
- cadastro de profissionais;
- cadastro de fórmulas, módulos e insumos;
- configuração de custos, parâmetros e backup;
- cadastro e movimentação de pacientes;
- prescrição nutricional;
- acompanhamento e evolução;
- geração de etiquetas, mapa oral, requisições e protocolos;
- emissão de cancelamentos técnicos;
- uso de relatórios e ferramentas clínicas;
- consulta e tratamento da sincronização.

### 3.2 Gestor Local

O gestor local atua principalmente na gestão da unidade e da operação local, incluindo:

- alas e horários padrão;
- perfis e permissões da unidade;
- profissionais;
- fórmulas, módulos e insumos;
- custos e parâmetros locais;
- pacientes e movimentação interna;
- prescrição nutricional;
- acompanhamento e evolução;
- etiquetas, mapa oral, requisições, protocolos e cancelamentos;
- relatórios e ferramentas;
- sincronização.

### 3.3 Nutricionista

O nutricionista é o ator central do fluxo assistencial, realizando:

- cadastro e atualização de pacientes;
- movimentação de pacientes entre alas, quando autorizado;
- prescrição oral, enteral e parenteral;
- definição de horários e parâmetros por paciente;
- registro de acompanhamento e evolução;
- geração de etiquetas;
- emissão de documentos operacionais;
- consulta de relatórios;
- uso de ferramentas clínicas;
- sincronização de pendências.

### 3.4 Técnico

O técnico atua principalmente nos processos operacionais do sistema:

- etiquetas clínicas;
- mapa da dieta oral;
- requisições;
- protocolo de entrega;
- cancelamento técnico;
- consulta e tratamento da sincronização.

## 4. Matriz Resumida de Casos de Uso

| Macroprocesso | Gestor Geral | Gestor Local | Nutricionista | Técnico |
|---|---|---|---|---|
| Acesso e sincronização | Sim | Sim | Sim | Sim |
| Gestão institucional | Sim | Sim | Não | Não |
| Cadastros de pacientes | Sim | Sim | Sim | Não |
| Cadastros de fórmulas, módulos e insumos | Sim | Sim | Não | Não |
| Prescrição nutricional | Sim | Sim | Sim | Não |
| Monitoramento/evolução | Sim | Sim | Sim | Não |
| Etiquetas | Sim | Sim | Sim | Sim |
| Mapa da dieta oral | Sim | Sim | Sim | Sim |
| Faturamento/requisições | Sim | Sim | Sim | Sim |
| Protocolo de entrega | Sim | Sim | Sim | Sim |
| Cancelamento técnico | Sim | Sim | Não | Sim |
| Relatórios | Sim | Sim | Sim | Não |
| Ferramentas clínicas | Sim | Sim | Sim | Não |

## 5. Síntese

O sistema foi concebido para apoiar, em um único ambiente digital, três grandes dimensões de trabalho:

- **gestão institucional**, com configurações, permissões e parâmetros;
- **assistência nutricional**, com cadastro, prescrição e acompanhamento;
- **operação e logística**, com etiquetas, protocolos, requisições e relatórios.

Essa organização permite separar claramente as atribuições dos diferentes perfis, sem perder a integração entre as etapas clínicas, administrativas e operacionais.

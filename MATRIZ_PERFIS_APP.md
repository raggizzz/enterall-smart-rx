# Matriz de Perfis do App

Atualizado conforme o fluxo operacional definido para:

- Gestor geral
- Gestor local
- Nutricionista
- Tecnico

Base tecnica:

- Permissoes padrao em `src/lib/permissions.ts`
- Protecao de rotas em `src/App.tsx`
- Navegacao inferior em `src/components/BottomNav.tsx`
- Configuracao por unidade em `src/pages/Settings.tsx`

## 1. Gestor geral

Objetivo:

- perfil com acesso total ao sistema
- administra unidades, alas, custos, cadastros, relatorios e perfis

Menu:

- Inicio
- Adicionar
- Cadastros
- Operacao

Pode acessar:

- dashboard
- pacientes
- prescricoes
- acompanhamento
- formulas e modulos
- insumos
- profissionais
- faturamento
- etiquetas
- mapa copa
- ferramentas
- relatorios
- configuracoes
- unidades
- alas
- perfis e permissoes

Pode cadastrar:

- gestor geral
- gestor local
- nutricionista
- tecnico

## 2. Gestor local

Objetivo:

- gestor da unidade
- controla operacao local sem administrar a estrutura global de outras unidades

Menu:

- Inicio
- Adicionar
- Cadastros
- Operacao

Pode acessar:

- dashboard
- pacientes
- prescricoes
- acompanhamento
- formulas e modulos
- insumos
- profissionais
- faturamento
- etiquetas
- mapa copa
- ferramentas
- relatorios
- configuracoes da unidade
- alas/setores
- perfis e permissoes da unidade

Nao pode:

- cadastrar ou editar unidades globais
- cadastrar gestores gerais

Pode cadastrar:

- nutricionista
- tecnico
- cadastro operacional da propria unidade

## 3. Nutricionista

Objetivo:

- perfil assistencial e operacional
- foco em paciente, prescricao, ferramentas, mapa, relatorios e impressos

Menu:

- Inicio
- Pacientes
- Ferramentas
- Operacao

Operacao:

- relatorios
- etiquetas
- mapa copa
- faturamento

Pode acessar:

- dashboard
- pacientes
- prescricoes
- oral
- enteral
- parenteral
- acompanhamento
- faturamento
- etiquetas
- mapa copa
- ferramentas
- relatorios

Nao pode:

- formulas e modulos
- insumos
- profissionais
- unidades
- alas
- custos
- perfis e permissoes

## 4. Tecnico

Objetivo:

- perfil de execucao operacional
- foco em requisicao, etiquetas, mapa e cancelamento tecnico

Menu:

- Inicio
- Faturamento
- Etiquetas
- Mapa Copa

Pode acessar:

- dashboard
- faturamento
- etiquetas
- mapa copa

Pode fazer:

- selecionar pacientes
- selecionar horarios
- selecionar alas/setores
- gerar requisicao
- imprimir requisicao
- registrar cancelamento tecnico

Nao pode:

- pacientes
- prescricoes
- acompanhamento
- ferramentas
- relatorios
- formulas
- insumos
- profissionais
- configuracoes

## 5. Observacoes importantes

- O tecnico continua com acesso ao `cancelamento tecnico` dentro do faturamento, conforme o fluxo solicitado.
- O nutricionista nao exibe mais `Cadastros` no menu inferior; usa `Ferramentas` e `Operacao`.
- O tecnico ficou com o menu inferior exatamente em `Inicio`, `Faturamento`, `Etiquetas` e `Mapa Copa`.
- O gestor geral tem acesso completo.
- O gestor local trabalha restrito a sua unidade.

## 6. Rotas protegidas

Perfis agora respeitam permissao real tambem por URL:

- `/patients` exige `manage_patients`
- `/prescription` e `/prescription-new` exigem `manage_prescriptions`
- `/oral-therapy` exige `manage_prescriptions`
- `/parenteral-therapy` exige `manage_prescriptions`
- `/patient-monitoring` exige `manage_monitoring`
- `/formulas` exige `manage_formulas`
- `/supplies` exige `manage_supplies`
- `/professionals` exige `manage_professionals`
- `/reports` exige `manage_reports`
- `/billing` exige `manage_billing`
- `/labels` exige `manage_labels`
- `/oral-map` exige `manage_oral_map`
- `/tools` exige `manage_tools`
- `/ai-recommendations` exige `manage_tools`
- `/select-route` exige `manage_prescriptions`
- `/settings` exige alguma permissao de configuracao

## 7. Cadastro de profissionais

Cadastro alinhado ao modelo operacional:

- nome completo
- funcao
- matricula
- CPF
- CRN
- senha de 8 digitos

Para gestor:

- unidade gestora
- codigo CPE

Perfis cadastraveis dependem do perfil logado:

- gestor geral pode cadastrar todos
- gestor local nao pode cadastrar gestor geral
- nutricionista e tecnico nao acessam o cadastro de profissionais

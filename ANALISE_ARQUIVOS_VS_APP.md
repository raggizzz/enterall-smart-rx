# Analise dos Arquivos vs App

## Escopo

Este documento consolida o que foi lido nos arquivos enviados e cruza cada pedido com o estado atual do app.

Legenda de status:

- `TEM`: encontrei implementacao funcional no app.
- `PARCIAL`: existe algo proximo, mas incompleto, simplificado ou sem persistencia correta.
- `FALTA`: nao encontrei implementacao suficiente.

Arquivos de referencia do app mais usados nesta analise:

- `src/pages/PrescriptionNew.tsx`
- `src/components/PatientMonitoring.tsx`
- `src/pages/Labels.tsx`
- `src/components/LabelPreview.tsx`
- `src/pages/Billing.tsx`
- `src/utils/requisitionGenerator.ts`
- `src/components/billing/RequisitionDocument.tsx`
- `src/pages/Reports.tsx`
- `src/components/SectorMapPrint.tsx`
- `src/pages/Formulas.tsx`
- `src/pages/Supplies.tsx`
- `src/pages/Settings.tsx`
- `src/lib/database.ts`

## Resumo Executivo

O app ja tem a estrutura principal dos modulos pedidos:

- prescricao enteral, oral e parenteral
- acompanhamento da TNE
- etiquetas
- mapa do setor
- requisicao/faturamento
- relatorios
- cadastros de formulas, modulos e insumos

Os maiores gaps hoje estao em:

- conformidade completa das etiquetas
- riqueza dos cadastros de formulas e modulos
- calculos e relatorios de custo
- formato final da requisicao
- persistencia real das configuracoes/custos
- itens novos como espessante, agua espessada, formula infantil e volume para equipo

## 1. como fazer calculos e outros.pdf

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Calculo de IMC = peso atual / estatura² | TEM | `src/pages/PrescriptionNew.tsx`, `src/components/SectorMapPrint.tsx`, `src/components/PatientMonitoring.tsx` | Manter e validar unidade de altura em todos os fluxos |
| Se IMC > 30, calcular para peso atual e peso ideal | TEM | `src/pages/PrescriptionNew.tsx`, `src/components/SectorMapPrint.tsx`, `src/components/PatientMonitoring.tsx` | Exibir isso de forma mais clara em todos os resumos |
| Formula de peso ideal com IMC 25 | TEM | mesmos arquivos acima | Padronizar nomenclatura `PI` nas telas |
| VET por velocidade x densidade x tempo | PARCIAL | `src/pages/PrescriptionNew.tsx` | Formalizar calculo mostrado ao usuario, inclusive exemplos e unidades |
| kcal/kg e proteina/kg | TEM | `src/pages/PrescriptionNew.tsx` | Validar se todas as vias seguem a mesma base de peso |
| Calculo de carboidratos e lipideos pelo % do VET | PARCIAL | modelo suporta em `src/lib/database.ts`, resumo ainda simplificado | Mostrar esses nutrientes no resumo e no "Mais detalhes" |
| Fibras calculadas por volume/dia | PARCIAL | estrutura de dados suporta fibra; UI nao exibe como no arquivo | Incluir fibra/dia no resumo detalhado |
| Cadastro completo de formulas/suplementos/modulos | PARCIAL | `src/pages/Formulas.tsx` | Expandir formulario para todos os campos do modelo |
| Fontes de proteina, carboidrato, lipidio e fibra | PARCIAL | campos existem em `src/lib/database.ts`; tela nao edita tudo | Expor campos na UI de cadastro e usar nos resumos |
| Micronutrientes K, P, Ca, Na | PARCIAL | campos existem no modelo; nao aparecem direito na UI | Adicionar ao cadastro e ao resumo nutricional |
| Agua livre total | TEM | `src/pages/PrescriptionNew.tsx` | Mostrar tambem em mapas e relatorios clinicos |
| Outras caracteristicas da formula | PARCIAL | existe `description`/`classification`; uso incompleto | Consolidar em um bloco visivel de caracteristicas |
| Residuos por 1000 ml | TEM | `src/pages/PrescriptionNew.tsx`, `src/pages/Reports.tsx` | Padronizar se formula usa g/1000 ml e insumo usa g/unidade |
| Cadastro de outros insumos com tipo, capacidade e residuos | TEM | `src/pages/Supplies.tsx` | Acrescentar subtipo mais rico e relacao explicita com faturamento |
| Rascunho de requisicao por paciente/horario | PARCIAL | `src/pages/Billing.tsx`, `src/components/billing/RequisitionDocument.tsx` | Ajustar layout para bater com o modelo pedido |

## 2. 050126 - maisdetalhes e outros.docx

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Custos indiretos - tempo de enfermagem por modalidade | TEM | `src/pages/Settings.tsx` | Corrigir persistencia real das configuracoes |
| Custo da hora de enfermagem | TEM | `src/pages/Settings.tsx` | Persistir e integrar ao calculo de custo diario |
| "Mais detalhes" com VET total e kcal/kg | TEM | `src/pages/PrescriptionNew.tsx` | Melhorar rotulos e organizacao dos dados |
| "Mais detalhes" com proteinas, carboidratos, lipideos e fibras | PARCIAL | `src/pages/PrescriptionNew.tsx` | Exibir todos os macro/micro com somatorio de formulas e modulos |
| Exibir fontes dos nutrientes puxadas do cadastro | FALTA | modelo existe em `src/lib/database.ts`, UI nao usa | Alimentar "Mais detalhes" com `proteinSources`, `carbSources`, `fatSources`, `fiberSources` |
| Exibir calcio, fosforo e outros micronutrientes somados | FALTA | modelo suporta parte disso | Implementar somatorio no resumo detalhado |
| Exibir residuos potencialmente reciclaveis por dia | TEM | `src/pages/PrescriptionNew.tsx` | Replicar no texto de prontuario e no mapa do nutricionista |
| Exibir tempo de enfermagem | PARCIAL | custo configuravel existe, nao vi exibicao final consistente | Levar para resumo da prescricao e relatorios |
| Sugestao de registro em prontuario automatico | FALTA | nao achei gerador de texto | Criar gerador de texto clinico por via |
| Sistema aberto com texto descritivo completo | FALTA | nao achei texto automatico | Gerar bloco padronizado para copiar no prontuario |
| Sistema fechado com texto descritivo completo | FALTA | idem | idem |
| Modulos descritos por produto, quantidade e frequencia | PARCIAL | dados existem na prescricao | Levar isso para texto de prontuario e mapa |
| Agua livre total ml/dia e ml/kg/dia | TEM | `src/pages/PrescriptionNew.tsx` | Replicar em mapa e relatorio clinico |
| Custo material + custo enfermagem + outros custos | PARCIAL | estrutura existe; fechamento ainda incompleto | Consolidar tudo em resumo financeiro por prescricao |
| Terapia nutricional oral com consistencia, caracteristicas e refeicoes | TEM | `src/pages/PrescriptionNew.tsx` | Ajustar experiencia e persistencia dos detalhes |
| Acompanhamento fonoaudiologico | TEM | `src/pages/PrescriptionNew.tsx` | Melhorar relacao entre fono, consistencia segura e espessante |
| Necessidade de espessante alimentar | PARCIAL | existe flag em oral | Falta produto, volume, horarios e calculos |
| Selecionar suplementos via oral ate 3 | TEM | `src/pages/PrescriptionNew.tsx` | Separar melhor suplemento, modulo e espessante |
| Horarios por refeicao para suplementos VO | TEM | `src/pages/PrescriptionNew.tsx` | Adicionar campo `outro horario` completo |
| Observacoes amplas de via oral | TEM | `src/pages/PrescriptionNew.tsx` | Reaproveitar em mapa, etiqueta e prontuario |
| Total ofertado via oral kcal/dia e g/dia | TEM | `src/pages/PrescriptionNew.tsx` | Exibir tambem em relatorio clinico |
| TNP com acesso central/periferico/PICC | TEM | `src/pages/PrescriptionNew.tsx` | Exibir na impressao do mapa e resumo |
| TNP com tempo de infusao da bolsa | TEM | `src/pages/PrescriptionNew.tsx` | Usar isso no calculo da TIG |
| TNP com VET, aminoacidos, lipideos e glicose | TEM | `src/pages/PrescriptionNew.tsx` | Formalizar visualizacao em mapa/resumo |
| Calculo de TIG em mg/kg/min | FALTA | nao encontrado | Implementar calculo e exibicao na prescricao e mapas |
| Cadastro do paciente com percentual de infusao 24h | TEM | `src/components/PatientMonitoring.tsx` | Padronizar com a evolucao diaria |
| Motivos de interrupcao da TNE | TEM | `src/components/PatientMonitoring.tsx` | Talvez simplificar visual conforme preferencia do usuario |
| Calorias nao intencionais: propofol, glicose, citrato | TEM | `src/components/PatientMonitoring.tsx` | Replicar no mapa clinico com mais detalhe |
| Aporte nutricional total | TEM | `src/components/PatientMonitoring.tsx` | Integrar melhor com relatorios e mapas |

## 3. devolutivas260226-mapasetoresugestao de impressao.xlsx

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Botao "Imprimir Mapa do Nutricionista" | TEM | `src/pages/Dashboard.tsx` | Manter |
| Impressao em preto, estilo funcional | PARCIAL | `src/components/SectorMapPrint.tsx` | Ajustar layout final para seguir o modelo da planilha |
| Suprimir trecho da via se o paciente nao tiver aquela via | TEM | `src/components/SectorMapPrint.tsx` | Manter |
| Mostrar PI somente para IMC >= 30 | TEM | `src/components/SectorMapPrint.tsx` | Manter |
| Ordem VO, NE, NP, kcal nao intencionais, total das vias | TEM | `src/components/SectorMapPrint.tsx` | Refinar microdetalhes de cada secao |
| Cabeçalho com leito, paciente, DN, estatura, peso, IMC, vias | TEM | `src/components/SectorMapPrint.tsx` | Completar com formato mais fiel ao modelo |
| Bloco VO com consistencia, fracionamento, fono e consistencia segura | TEM | `src/components/SectorMapPrint.tsx` | Acrescentar suplemento e modulo VO de forma mais rica |
| Bloco TNVO e modulo VO detalhados | PARCIAL | mapa oral e setor sao mais simples | Unificar dados de oralDetails no mapa impresso |
| Bloco TNE com sistema, acesso, infusao, velocidade | TEM | `src/components/SectorMapPrint.tsx` | Diferenciar melhor aberto x fechado |
| Exibir formulas com quantidade, horarios e velocidade | PARCIAL | aparece de forma resumida | Detalhar igual planilha |
| Exibir bolsas solicitadas por horario no sistema fechado | FALTA | nao achei isso no mapa | Levar `bagQuantities` para impressao |
| Exibir modulos enterais detalhados | TEM | `src/components/SectorMapPrint.tsx` | Enriquecer texto |
| Exibir agua para hidratacao e agua livre total | PARCIAL | hidratacao aparece; agua livre total nao aparece bem | Exibir as duas linhas como no modelo |
| Exibir VET TNE com macro por kg | PARCIAL | hoje mostra kcal/kg e proteina/kg | Incluir carboidrato e lipidio/kg |
| Exibir TNP com TIG e macro por kg | PARCIAL | hoje mostra pouco detalhe | Incluir TIG e campos do modelo |
| Exibir kcal nao intencionais por fonte | PARCIAL | mostra total | Quebrar por propofol, glicose e citrato |
| Exibir observacoes do acompanhamento no mapa | TEM | `src/components/SectorMapPrint.tsx` | Melhorar quebra de linha e historico |

## 4. devolutivas 260226-parte2 - relatorios de gestao.xlsx

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Filtro por periodo | TEM | `src/pages/Reports.tsx` | Manter |
| Filtro por unidade e ala | TEM | `src/pages/Reports.tsx` | Manter |
| Historico assistencial | TEM | `src/pages/Reports.tsx` | Manter |
| Consumo de produtos no periodo | TEM | `src/pages/Reports.tsx` | Manter |
| Consumo por produto comparativo | TEM | `src/pages/Reports.tsx` | Manter |
| Geracao de residuos reciclaveis | TEM | `src/pages/Reports.tsx` | Manter |
| Pacientes atendidos / prescricoes / media por dia | PARCIAL | ha indicadores, nao exatamente esses | Implementar metricas da planilha |
| Quantidade utilizada total e media/dia por item | PARCIAL | volume total existe | Adicionar media/dia por item |
| Numero de prescricoes em que o item aparece | FALTA | nao vi esse calculo | Calcular pacientes/prescricoes atendidas por item |
| Valor total gasto por item | FALTA | custo nao consolidado por item | Integrar formulas/modulos/insumos com preco |
| Valor gasto por produto/dia | FALTA | nao vi | Implementar |
| Subtotal de formulas, modulos e insumos | FALTA | nao vi | Implementar blocos de subtotal |
| Total do periodo | FALTA | nao vi custo total | Implementar |
| Media por paciente no periodo | FALTA | nao vi | Implementar custo total / prescricoes |
| Quantidade media por paciente que utilizou o produto | FALTA | nao vi | Implementar |
| Residuo reciclavel por paciente (media) | FALTA | app mostra total por material | Adicionar media por paciente/prescricao |

## 5. requisicao pelo app baseado outro app.pdf

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Mapa horizontal por paciente e horario | TEM | `src/components/billing/RequisitionDocument.tsx` | Ajustar colunas para bater com a referencia |
| Colunas leito, data de nascimento, paciente, via, produto, horario, volume, vel infusao, agua, modulos | PARCIAL | parte dessas colunas existe | Incluir DOB, separar melhor agua e modulos |
| Agua como linha propria | TEM | `src/utils/requisitionGenerator.ts` | Manter |
| Modulos como linhas proprias | TEM | `src/utils/requisitionGenerator.ts` | Manter |
| Cabecalho com hospital, ala e data | PARCIAL | existe, mas hospital esta fixo como "Unidade Modelo" | Usar dados reais da unidade e ala |
| Consolidado de produtos + insumos com valor unitario e subtotal | TEM | `src/components/billing/RequisitionDocument.tsx` | Melhorar agrupamento e formatacao |
| Assinaturas tecnico / nutricionista / RT com matricula | PARCIAL | tem assinatura sem matricula | Adicionar campos de matricula |
| Escolher imprimir oral ou enteral separadamente | FALTA | nao achei | Adicionar filtro de via em Billing |
| Rastreabilidade para auditoria por produto e paciente | PARCIAL | mapa ajuda, mas falta acabamento | Incluir campos obrigatorios e exportacao melhor |
| Cancelamento tecnico de dieta | FALTA | nao achei fluxo proprio | Definir regra funcional e UI |
| Mudanca de prescricao valer a partir da alteracao | PARCIAL | app atual usa prescricoes ativas e datas | Formalizar regra temporal no faturamento |

## 6. cadastrodeformulaseoutros.xlsx

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Prescricao de NE com sistema aberto/fechado | TEM | `src/pages/PrescriptionNew.tsx` | Manter |
| Escolha de via de acesso | TEM | `src/pages/PrescriptionNew.tsx` | Manter |
| Bomba, gravitacional, bolus | TEM | `src/pages/PrescriptionNew.tsx` | Manter |
| Multiplos horarios por formula | TEM | `src/pages/PrescriptionNew.tsx` | Manter |
| Modulos em horarios proprios | TEM | `src/pages/PrescriptionNew.tsx` | Manter |
| Agua livre / hidratacao em horarios proprios | TEM | `src/pages/PrescriptionNew.tsx` | Manter |
| Tela de impressao de etiquetas com filtros | TEM | `src/pages/Labels.tsx` | Manter |
| Cadastro de formula com codigo, fabricante, nome, embalagem, apresentacao e faturamento | PARCIAL | `src/pages/Formulas.tsx` | Completar UI com todos os campos |
| Tipo de produto formula enteral / suplemento / formula infantil / modulo / outros | PARCIAL | modelo suporta, UI de formulas esta limitada | Expor tipo na tela e separar fluxos |
| Densidade calorica | TEM | `src/pages/Formulas.tsx` | Manter |
| Complexidade oligomerica/polimerica | FALTA | nao vi na UI | Adicionar campo e uso |
| Classificacao normativa | FALTA | nao vi na UI | Adicionar campo e uso |
| Macronutrientes em % do VET | TEM | `src/pages/Formulas.tsx` | Manter |
| Fontes dos nutrientes | FALTA | nao vi na UI | Adicionar |
| Fibras com tipo e fonte | PARCIAL | fibra existe, tipo/fonte nao completos | Adicionar tipo de fibra e uso em relatorios |
| Potassio, fosforo, calcio, sodio | FALTA | nao vi na UI | Adicionar no cadastro |
| Agua livre total % | FALTA | nao vi na UI | Adicionar e usar nos calculos |
| Outras caracteristicas | FALTA | nao vi campo estruturado no cadastro atual | Adicionar |
| Residuos de plastico, papel, aco, aluminio, vidro | PARCIAL | ha residuos; UI nao separa aco/aluminio | Definir se metal geral basta ou se precisa detalhar |
| Cadastro de modulos com descricao e nutrientes | PARCIAL | `src/pages/Formulas.tsx` | Completar campos do cadastro |
| Cadastro de frasco | TEM | `src/pages/Supplies.tsx` | Manter |
| Cadastro de equipo | TEM | `src/pages/Supplies.tsx` | Manter |
| Cadastro de outros insumos | TEM | `src/pages/Supplies.tsx` | Manter |

## 7. pendencias alicia reuniao 080126.pdf

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Volume para equipo na prescricao enteral aberta | FALTA | `equipmentVolume` existe no modelo, sem fluxo completo | Adicionar campo, calculo e faturamento |
| Volume para equipo nao entra no calculo nutricional | FALTA | nao vi regra implementada | Implementar separacao explicita |
| Para dieta em po, converter gramatura proporcional ao volume para equipo | FALTA | nao vi | Implementar regra de conversao |
| Trocar ordem entre espessante e consistencia segura | PARCIAL | existe parte da UI oral | Ajustar UX |
| Agua espessada com volume, produto, quantidade por horario e horarios | FALTA | nao achei | Criar bloco proprio na via oral |
| Criar categoria espessante nos produtos | FALTA | nao existe tipo dedicado | Adicionar tipo/categoria de produto |
| Dividir enterais em infantil, pediatrica, adulto | FALTA | nao existe fluxo especifico | Rever taxonomia de produtos e UI de prescricao |
| Formula infantil com copo, mamadeira ou frasco | FALTA | nao achei | Criar subtipo e regra de cobranca |
| Copo e mamadeira nao cobrados; frasco cobrado | FALTA | nao achei | Implementar regra no faturamento |
| Via oral e translactacao nas formulas infantis | FALTA | nao achei | Implementar opcoes de via |
| Melhorar usabilidade das listas suspensas por categoria | PARCIAL | hoje ha alguma filtragem, mas nao estrutural | Refatorar catalogo e filtros |

## 8. o que deve constar em rotulos e etiquetas.pdf

| Pedido do arquivo | Status | Onde esta no app | Acao sugerida |
| --- | --- | --- | --- |
| Nome do paciente | TEM | `src/components/LabelPreview.tsx` | Manter |
| Leito | TEM | `src/components/LabelPreview.tsx` | Manter |
| Data de nascimento | TEM | `src/components/LabelPreview.tsx` | Manter |
| Registro hospitalar | FALTA | `LabelData` tem `record`, mas nao eh renderizado | Exibir prontuario na etiqueta |
| Nome da formula | TEM | `src/components/LabelPreview.tsx` | Manter |
| Volume total | TEM | `src/components/LabelPreview.tsx` | Manter |
| Velocidade de administracao | TEM | `src/components/LabelPreview.tsx` | Manter |
| Via de acesso | TEM | `src/components/LabelPreview.tsx` | Manter |
| Data e hora da manipulacao | TEM | `src/components/LabelPreview.tsx` | Manter |
| Prazo de validade | TEM | `src/components/LabelPreview.tsx` | Manter |
| Numero sequencial de controle | FALTA | campo nao eh exibido | Reativar/gerar controle sequencial |
| Condicoes de temperatura para conservacao | PARCIAL | dado existe em configuracao, nao aparece no preview | Mostrar conservacao na etiqueta |
| Nome e registro do RT | TEM | `src/components/LabelPreview.tsx` | Manter |
| Composicao qualitativa e quantitativa de todos os componentes | PARCIAL | formula/composicao aparece de forma resumida | Enriquecer texto para aberto, agua com modulos e VO |
| Regra especial de sistema fechado | PARCIAL | ha distincao de tipo e validade, mas nao completa | Ajustar texto e campos conforme RDC/modelo |
| Etiqueta especifica para agua com modulos | TEM | `src/pages/Labels.tsx` | Manter e melhorar layout |
| Etiqueta especifica para modulos VO | TEM | `src/pages/Labels.tsx` | Manter |
| Etiqueta especifica para suplemento oral liquido | TEM | `src/pages/Labels.tsx` | Manter |
| Etiqueta especifica para suplemento oral em po | TEM | `src/pages/Labels.tsx` | Manter |

## Gaps Transversais Importantes

### Persistencia

| Item | Status | Onde esta | Acao sugerida |
| --- | --- | --- | --- |
| Configuracoes de etiquetas e custos realmente persistidas | FALTA | `src/lib/database.ts` | Substituir mock de `settingsService` por persistencia real |
| Custos usados em calculos finais de prescricao e relatorio | PARCIAL | modelo e settings existem | Integrar ponta a ponta |

### Cadastros

| Item | Status | Onde esta | Acao sugerida |
| --- | --- | --- | --- |
| Cadastro de formulas completo | PARCIAL | `src/pages/Formulas.tsx` | Expandir formulario |
| Cadastro de modulos completo | PARCIAL | `src/pages/Formulas.tsx` | Expandir formulario |
| Cadastro de espessantes | FALTA | nao achei | Criar categoria/tipo |
| Cadastro detalhado de residuos por metal especifico | PARCIAL | `src/pages/Formulas.tsx`, `src/pages/Supplies.tsx` | Definir se mantem metal unico ou separa aluminio/aco |

### Relatorios e impressos

| Item | Status | Onde esta | Acao sugerida |
| --- | --- | --- | --- |
| Texto automatico para prontuario | FALTA | nao achei | Criar gerador |
| Mapa do nutricionista no nivel da planilha | PARCIAL | `src/components/SectorMapPrint.tsx` | Enriquecer linhas e ordem |
| Requisicao no nivel do PDF de referencia | PARCIAL | `src/components/billing/RequisitionDocument.tsx` | Ajustar layout e filtros |
| Relatorio gerencial com custos completos | FALTA | `src/pages/Reports.tsx` | Implementar metricas faltantes |

## Prioridade Recomendada

### Prioridade 1

- Corrigir persistencia de configuracoes e custos
- Completar etiquetas para conformidade minima
- Completar requisicao/faturamento com cabecalho real e assinaturas melhores
- Implementar volume para equipo

### Prioridade 2

- Expandir cadastro de formulas, modulos e espessantes
- Completar "Mais detalhes" da prescricao
- Adicionar TIG da parenteral
- Completar mapa do nutricionista

### Prioridade 3

- Fechar relatorios gerenciais de custo
- Gerar texto automatico para prontuario
- Separar fluxos infantil / pediatrico / adulto

## Checklist Final Consolidado

### Ja existe base boa no app

- prescricao enteral, oral e parenteral
- acompanhamento da TNE
- calorias nao intencionais
- etiquetas por tipo
- mapa do setor com impressao
- requisicao com consolidado
- relatorios de consumo e residuos
- cadastro de insumos com residuos

### Existe, mas precisa fechar

- custos e configuracoes
- "Mais detalhes"
- mapa do nutricionista
- etiquetas em conformidade total
- requisicao no formato desejado
- relatorios gerenciais com custo
- cadastros completos de formulas e modulos

### Nao encontrei implementado

- TIG
- volume para equipo
- espessante completo
- agua espessada
- texto automatico de prontuario
- categoria de espessante
- fluxo de formula infantil/pediatrica/adulto
- translactacao
- cancelamento tecnico formal

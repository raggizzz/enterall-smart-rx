# Revisao Final Atualizada dos PDFs e Excel

## Rechecagem dos arquivos-fonte em 16/03/2026

- `050126 - maisdetalhes e outros.docx`: texto extraido e conferido.
- `devolutivas260226-mapasetoresugestao de impressao.xlsx`: planilhas extraidas e conferidas.
- `devolutivas 260226-parte2 - relatorios de gestao.xlsx`: planilha extraida e conferida.
- `cadastrodeformulaseoutros.xlsx`: planilha extraida e conferida parcialmente; o arquivo tem bastante conteudo visual e alguns simbolos especiais.
- `pendencias alicia reuniao 080126.pdf`: PDF com texto parcialmente extraivel, conferido.
- `requisicao pelo app baseado outro app.pdf`: PDF com texto extraivel, conferido.
- `o que deve constar em rotulos e etiquetas.pdf`: PDF com texto extraivel, conferido.
- `como fazer calculos e outros.pdf`: PDF sem texto extraivel via leitura direta; a conferencia continua baseada na revisao funcional anterior e no comportamento ja implementado no app.
  - Depois, o usuario enviou imagens do proprio PDF no chat, confirmando manualmente os blocos de IMC/PI, cadastro de formulas, residuos, outros insumos, calculos, cadastro de profissionais e formato base da requisicao.

## Como ler este documento

- `TEM`: implementado de forma funcional no app atual.
- `PARCIAL`: existe e funciona, mas ainda falta acabamento fino, visual ou alguma regra complementar.
- `FALTA`: ainda nao encontrei cobertura suficiente no estado atual do app.

Arquivos do app mais impactados nesta rodada:

- `src/pages/PrescriptionNew.tsx`
- `src/components/PrescriptionDetails.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Billing.tsx`
- `src/utils/requisitionGenerator.ts`
- `src/components/billing/RequisitionDocument.tsx`
- `src/pages/Labels.tsx`
- `src/components/LabelPreview.tsx`
- `src/components/SectorMapPrint.tsx`
- `src/pages/Formulas.tsx`
- `src/pages/Supplies.tsx`
- `src/lib/database.ts`

## Resumo executivo atualizado

### O que ficou forte no app

- calculos clinicos centrais: IMC, PI, VET, macros, agua livre, residuos e TIG
- cadastro rico de formulas, modulos e insumos
- espessante, agua espessada e categoria de produto para esse fluxo
- volume para equipo fora do calculo nutricional e dentro do faturamento
- translactacao e forma de oferta infantil
- relatorios gerenciais com custo, subtotais, medias e residuos
- mapa do nutricionista muito mais detalhado
- etiquetas e requisicao bem mais completas
- sugestao de texto para prontuario

### O que ainda pede acabamento fino

- fidelidade visual total dos impressos aos modelos externos
- conformidade regulatoria mais fina das etiquetas em alguns cenarios
- fluxo formal de cancelamento tecnico no faturamento
- auditoria temporal mais rigorosa para virada de prescricao
- separacao visual ainda mais explicita por fluxo adulto, pediatrico e infantil
- separacao de `metal` em `aco` e `aluminio`, se isso for obrigatorio para a operacao

## Alteracoes principais feitas no app

- `PrescriptionNew.tsx`
  - ampliado o fluxo de calculos, macros, micros, agua livre e residuos
  - incluido `TIG` da parenteral
  - incluido `volume para equipo` na enteral aberta
  - incluido `espessante`, `agua espessada`, `translactacao` e `forma de oferta` infantil
  - filtros de formula por idade e rota ficaram mais inteligentes
- `Formulas.tsx`
  - cadastro de formulas mais rico: classificacao, complexidade, tipo, rotas, fontes, fibras, micros, agua livre, residuos, faturamento
  - cadastro de modulos tambem ampliado
- `Supplies.tsx`
  - categorias como `espessante`, `mamadeira` e `frasco para dieta`
  - suporte a item faturavel ou nao faturavel
- `Reports.tsx`
  - relatorio gerencial com custo total, custo por produto-dia, medias, pacientes, prescricoes, subtotais e residuos
- `Billing.tsx`, `requisitionGenerator.ts` e `RequisitionDocument.tsx`
  - filtro por via
  - mapa por paciente e horario mais rico
  - consolidado com valores
  - regra de cobranca para `frasco para dieta`
- `Labels.tsx` e `LabelPreview.tsx`
  - etiqueta com prontuario, controle, conservacao, via, validade e composicao mais rica
  - rota de translactacao corrigida no rotulo
  - composicao enriquecida com fabricante, classificacao, densidade, macros, agua livre, fontes e contexto oral
  - sistema fechado passou a usar melhor a regra do PDF: data da prescricao na bolsa e validade de 24h apos abertura
- `SectorMapPrint.tsx`
  - mapa com VO, NE, NP, kcal nao intencionais e total das vias, com muito mais detalhe
- `PrescriptionDetails.tsx`
  - texto automatico de prontuario ampliado para oral, translactacao e parenteral

## 1. como fazer calculos e outros.pdf

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| IMC e peso ideal para IMC > 30 | TEM | `PrescriptionNew.tsx`, `SectorMapPrint.tsx`, `PatientMonitoring.tsx` | Ja aparece na prescricao, mapa e acompanhamento |
| VET e proteina/kg | TEM | `PrescriptionNew.tsx`, `PrescriptionDetails.tsx` | Ja consolidado nos calculos e nos detalhes |
| Carboidratos, lipideos e fibras | TEM | `PrescriptionNew.tsx`, `PrescriptionDetails.tsx` | Ja entram no resumo nutricional |
| Agua livre total | TEM | `PrescriptionNew.tsx`, `SectorMapPrint.tsx`, `PrescriptionDetails.tsx` | Ja aparece na visao clinica |
| Micronutrientes principais | TEM | `Formulas.tsx`, `PrescriptionNew.tsx`, `PrescriptionDetails.tsx` | Sodio, potassio, calcio e fosforo entram no cadastro e no consolidado |
| Fontes dos nutrientes | TEM | `Formulas.tsx`, `PrescriptionNew.tsx`, `PrescriptionDetails.tsx` | Fontes proteicas, carboidratos, gorduras e fibras ja existem |
| Residuos por 1000 ml | TEM | `PrescriptionNew.tsx`, `Reports.tsx` | Ja entram no calculo e nos relatorios |
| Cadastro amplo de formulas, modulos e insumos | TEM | `Formulas.tsx`, `Supplies.tsx` | Cadastro ficou bem mais completo |
| Requisicao baseada no rascunho | PARCIAL | `Billing.tsx`, `requisitionGenerator.ts`, `RequisitionDocument.tsx` | Funciona bem, mas ainda pode ser lapidada visualmente |

## 2. 050126 - maisdetalhes e outros.docx

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Custos de enfermagem e custos indiretos | TEM | `Settings.tsx`, backend de configuracoes, `Reports.tsx` | Ja ha configuracao e uso mais amarrado |
| Mais detalhes com VET, macros, agua livre e residuos | TEM | `PrescriptionNew.tsx`, `PrescriptionDetails.tsx` | Ja aparece no fluxo clinico |
| Texto automatico de prontuario | TEM | `PrescriptionDetails.tsx` | Cobertura ampliada para oral, translactacao e parenteral |
| Terapia oral com consistencia, fono, suplementos e modulos | TEM | `PrescriptionNew.tsx` | Fluxo completo |
| Espessante com produto, volume e horarios | TEM | `PrescriptionNew.tsx`, `SectorMapPrint.tsx` | Ja existe no fluxo oral |
| Terapia parenteral com acesso, tempo, AA, lipidio, glicose e VET | TEM | `PrescriptionNew.tsx`, `SectorMapPrint.tsx` | Fluxo completo |
| TIG em mg/kg/min | TEM | `PrescriptionNew.tsx`, `SectorMapPrint.tsx`, `PrescriptionDetails.tsx` | Calculado e exibido |
| Interrupcoes da TNE | TEM | `PatientMonitoring.tsx` | Monitoramento cobre isso |
| Calorias nao intencionais | TEM | `PatientMonitoring.tsx`, `SectorMapPrint.tsx`, `Reports.tsx` | Ja entram nos calculos e visualizacoes |

## 3. devolutivas260226-mapasetoresugestao de impressao.xlsx

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Botao e impressao do mapa do nutricionista | TEM | `Dashboard.tsx`, `SectorMapPrint.tsx` | Disponivel |
| Ordem VO > NE > NP > kcal nao intencionais > total | TEM | `SectorMapPrint.tsx` | Ja aplicada |
| Mostrar so vias existentes | TEM | `SectorMapPrint.tsx` | Ja aplicado |
| PI so para IMC >= 30 | TEM | `SectorMapPrint.tsx` | Ja aplicado |
| VO detalhada com consistencia, fono, suplemento, modulo e espessante | TEM | `SectorMapPrint.tsx` | Ja no mapa |
| NE detalhada com formulas, modulos, agua e resumo nutricional | TEM | `SectorMapPrint.tsx` | Ja no mapa |
| Bolsas por horario no sistema fechado | TEM | `SectorMapPrint.tsx`, `PrescriptionNew.tsx` | Ja no mapa |
| NP com TIG e composicao | TEM | `SectorMapPrint.tsx`, `PrescriptionNew.tsx` | Ja no mapa |
| kcal nao intencionais por fonte | TEM | `SectorMapPrint.tsx`, `PatientMonitoring.tsx` | Ja discriminadas |
| Fidelidade visual total ao modelo | PARCIAL | `SectorMapPrint.tsx` | Conteudo esta forte, mas o layout ainda pode ser lapidado |

## 4. devolutivas 260226-parte2 - relatorios de gestao.xlsx

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Filtros por periodo, unidade, ala e paciente | TEM | `Reports.tsx` | Ja no relatorio |
| Historico assistencial | TEM | `Reports.tsx` | Ja no relatorio |
| Consumo no periodo | TEM | `Reports.tsx` | Ja no relatorio |
| Comparacao por produto | TEM | `Reports.tsx` | Ja no relatorio |
| Residuos reciclaveis | TEM | `Reports.tsx` | Ja no relatorio |
| Pacientes atendidos, prescricoes e paciente-dia | TEM | `Reports.tsx` | Ja calculado |
| Quantidade total e media/dia por item | TEM | `Reports.tsx` | Ja calculado |
| Numero de prescricoes por item | TEM | `Reports.tsx` | Ja calculado |
| Valor total por item | TEM | `Reports.tsx` | Ja calculado |
| Valor por produto-dia | TEM | `Reports.tsx` | Ja calculado |
| Subtotal formulas, modulos e insumos | TEM | `Reports.tsx` | Ja calculado |
| Total do periodo | TEM | `Reports.tsx` | Ja calculado |
| Media por paciente | TEM | `Reports.tsx` | Ja calculado |
| Quantidade media por paciente que usou o produto | TEM | `Reports.tsx` | Ja calculado |
| Residuo medio por paciente | TEM | `Reports.tsx` | Ja calculado |

## 5. requisicao pelo app baseado outro app.pdf

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Mapa por paciente e horario | TEM | `RequisitionDocument.tsx` | Ja implementado |
| Agua e modulos em linhas proprias | TEM | `requisitionGenerator.ts`, `RequisitionDocument.tsx` | Ja implementado |
| DOB, via, horarios e velocidade | TEM | `Billing.tsx`, `RequisitionDocument.tsx` | Ja implementado |
| Consolidado com codigo, unidade, preco unitario e subtotal | TEM | `RequisitionDocument.tsx` | Ja implementado |
| Subtotais por categoria | TEM | `RequisitionDocument.tsx` | Ja implementado |
| Filtro por via oral, enteral e parenteral | TEM | `Billing.tsx` | Ja implementado |
| Cabecalho com unidade e setores/horarios | TEM | `RequisitionDocument.tsx` | Ja implementado |
| Assinaturas com linha de matricula | TEM | `RequisitionDocument.tsx` | Ja implementado |
| Rastreabilidade melhorada | TEM | `requisitionGenerator.ts`, `RequisitionDocument.tsx` | Mapa e consolidado estao mais ricos |
| Cancelamento tecnico formal | TEM | `Billing.tsx`, `server/src/routes/prescriptions.ts`, `server/prisma/schema.prisma` | Agora existe suspensao tecnica com motivo, data efetiva e responsavel |
| Regra temporal de mudanca de prescricao totalmente formalizada | PARCIAL | `Billing.tsx`, `requisitionGenerator.ts` | Datas e ativos ajudam, mas auditoria fina ainda pode melhorar |

## 6. cadastrodeformulaseoutros.xlsx

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Prescricao enteral aberta e fechada com horarios, agua e modulos | TEM | `PrescriptionNew.tsx` | Ja completo |
| Etiquetas com filtros | TEM | `Labels.tsx` | Ja completo |
| Cadastro de formulas com codigo, fabricante, apresentacao e faturamento | TEM | `Formulas.tsx` | Ja completo |
| Tipo do produto, inclusive suplemento e formula infantil | TEM | `Formulas.tsx` | Ja completo |
| Densidade calorica | TEM | `Formulas.tsx` | Ja completo |
| Complexidade polimerica e oligomerica | TEM | `Formulas.tsx` | Ja completo |
| Classificacao | TEM | `Formulas.tsx` | Ja completo |
| Macronutrientes em % do VET | TEM | `Formulas.tsx` | Ja completo |
| Fontes de nutrientes | TEM | `Formulas.tsx` | Ja completo |
| Fibras com tipo e fonte | TEM | `Formulas.tsx` | Ja completo |
| Potassio, fosforo, calcio e sodio | TEM | `Formulas.tsx` | Ja completo |
| Agua livre | TEM | `Formulas.tsx` | Ja completo |
| Outras caracteristicas | TEM | `Formulas.tsx` | Ja completo |
| Residuos por material | PARCIAL | `Formulas.tsx`, `Supplies.tsx`, `Reports.tsx` | O app usa `metal` unico; nao separa `aco` e `aluminio` |
| Cadastro de modulos com descricao e nutrientes | TEM | `Formulas.tsx` | Ja completo |
| Cadastro de frasco, equipo e outros insumos | TEM | `Supplies.tsx` | Ja completo |

## 7. pendencias alicia reuniao 080126.pdf

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Volume para equipo na enteral aberta | TEM | `PrescriptionNew.tsx`, `Reports.tsx`, `requisitionGenerator.ts` | Ja existe no fluxo |
| Volume para equipo nao entra no calculo nutricional | TEM | `PrescriptionNew.tsx`, `requisitionGenerator.ts` | Regra aplicada |
| Conversao proporcional para dieta em po | TEM | `Reports.tsx`, `requisitionGenerator.ts` | Regra considerada |
| Agua espessada com volume, produto e horarios | TEM | `PrescriptionNew.tsx`, `SectorMapPrint.tsx`, `PrescriptionDetails.tsx` | Ja existe |
| Categoria espessante nos produtos | TEM | `Supplies.tsx` | Ja existe |
| Formula infantil com copo, mamadeira ou frasco | TEM | `PrescriptionNew.tsx` | Ja existe na via oral |
| Copo e mamadeira nao cobrados; frasco cobrado | TEM | `requisitionGenerator.ts` | Regra entrou no faturamento |
| Via oral e translactacao nas formulas infantis | TEM | `PrescriptionNew.tsx`, `Labels.tsx`, `SectorMapPrint.tsx` | Ja existe |
| Separacao por adulto, pediatrico e infantil | PARCIAL | `PrescriptionNew.tsx`, `Formulas.tsx` | O filtro por idade existe e a prescricao enteral ganhou avisos mais claros, mas a UX ainda pode ficar mais explicita |
| Usabilidade melhor das listas por categoria | PARCIAL | `PrescriptionNew.tsx`, `Formulas.tsx`, `Supplies.tsx` | Melhorou com filtros por rota e idade, mas ainda pode evoluir |

## 8. o que deve constar em rotulos e etiquetas.pdf

| Pedido | Status | Onde esta no app | Observacao atual |
| --- | --- | --- | --- |
| Nome do paciente, leito e DOB | TEM | `LabelPreview.tsx` | Ja na etiqueta |
| Registro hospitalar | TEM | `LabelPreview.tsx` | Ja na etiqueta |
| Formula, volume, velocidade e via | TEM | `LabelPreview.tsx`, `Labels.tsx` | Ja na etiqueta |
| Data e hora de manipulacao e validade | TEM | `LabelPreview.tsx` | Ja na etiqueta |
| Controle sequencial visivel | TEM | `LabelPreview.tsx`, `Labels.tsx` | Ja na etiqueta |
| Conservacao e temperatura | TEM | `LabelPreview.tsx`, `Labels.tsx` | Ja na etiqueta |
| RT e registro | TEM | `LabelPreview.tsx` | Ja na etiqueta |
| Etiquetas por tipo: aberto, fechado, agua com modulos e VO | TEM | `Labels.tsx` | Ja no gerador |
| Composicao qualitativa e quantitativa em todos os cenarios | PARCIAL | `Labels.tsx`, `LabelPreview.tsx` | Melhorada com dados de fabricante, classificacao, densidade, macros, fontes, forma de oferta e espessante, mas ainda pode ser enriquecida em casos especiais |
| Aderencia regulatoria fina ao modelo | PARCIAL | `Labels.tsx`, `LabelPreview.tsx` | Conteudo principal esta coberto; acabamento fino ainda pode melhorar |

## Pendencias reais que sobraram

- auditoria temporal mais detalhada para virada de prescricao em faturamento
- acabamento visual final da requisicao e do mapa para copiar mais de perto os modelos
- acabamento regulatorio fino das etiquetas em casos especiais
- separar `metal` em `aco` e `aluminio`, se isso for obrigatorio para sua operacao
- deixar a UX de adulto, pediatrico e infantil ainda mais evidente na prescricao

## Conclusao honesta

Comparando o app atual com os PDFs e Excel, a parte clinica, de calculo, cadastro, mapa, requisicao e relatorios avancou muito e hoje cobre quase tudo o que foi pedido de forma funcional.

O que ainda resta esta concentrado em acabamento fino, conformidade visual e alguns fluxos operacionais bem especificos, nao mais na ausencia do nucleo principal das funcionalidades.

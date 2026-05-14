# Checklist de Testes - Alteracoes 13/05/2026

Use este arquivo para marcar o que foi validado no ambiente atual e depois repetir no codigo mais recente do Igor.

Legenda:

* \[ ] Nao testado
* \[x] Ok
* \[\~] Parcial
* \[!] Errado

## 1\. Horarios padrao da clinica na prescricao

* \[x] Adicionei um horario novo na configuracao da clinica (ex.: 10:00)
* \[x] Removi um horario antigo da clinica (ex.: 00:00)
* \[x] Abri uma prescricao nova de paciente da mesma clinica
* \[x] O horario novo apareceu na prescricao
* \[x] O horario removido nao apareceu na prescricao
* \[\~] Modulos / hidratacao / agua espessada seguiram o novo padrao

## 2\. Agua espessada obrigando preenchimento correto

* \[x] Marquei agua espessada sem selecionar espessante
* \[x] O sistema bloqueou o save
* \[x] Marquei agua espessada sem quantidade/volume
* \[x] O sistema bloqueou o save
* \[x] Marquei agua espessada sem horario
* \[x] O sistema bloqueou o save
* \[\~] Preenchi tudo corretamente e o save funcionou

## 3\. Horarios padrao no espessante

* \[x] Marquei agua espessada com horarios vazios
* \[x] O sistema puxou os horarios padrao da clinica
* \[x] O horario removido (ex.: 00:00) nao reapareceu

## 4\. Requisicao do espessante com nome e codigo

* \[ ] Fiz uma prescricao com espessante selecionado
* \[ ] Gerei a requisicao / mapa do lactario
* \[ ] O nome do espessante apareceu
* \[ ] O codigo do espessante apareceu
* \[ ] Nao saiu apenas como "Espessante" generico

## 5\. Enteral com acesso VO sem frasco e sem equipo

* \[ ] Fiz prescricao enteral com acesso VO
* \[ ] Gerei faturamento / requisicao / consolidado
* \[ ] Nao somou frasco
* \[ ] Nao somou equipo
* \[ ] O item ficou coerente como via oral

## 6\. Interface da prescricao enteral em VO

* \[\~] A etapa mostrou linguagem de oferta por via oral
* \[x] Nao precisei depender de bomba / gravidade / bolus para avancar
* \[ ] O volume apareceu como quantidade por oferta
* \[ ] Os horarios ficaram coerentes como ofertas

## 7\. Texto sugerido de prontuario para VO

* \[ ] O texto sugerido mencionou formula por via oral
* \[ ] Quando usei formula infantil, apareceu "Formula infantil"
* \[ ] O texto nao ficou com cara de infusao enteral classica

## 8\. Agua usando nome/codigo do cadastro

* \[ ] Alterei nome/codigo do item de hidratacao no cadastro
* \[ ] Gerei requisicao
* \[ ] Gerei etiqueta de agua
* \[ ] O nome do cadastro apareceu
* \[ ] O codigo do cadastro apareceu
* \[ ] Nao ficou preso em "Water 001"

## 9\. Frascos por faixa de capacidade

* \[ ] Testei faixa 0 a 100
* \[ ] Testei faixa 101 a 300
* \[ ] Testei faixa 301 a 500
* \[ ] O frasco foi classificado corretamente em cada caso

## 10\. Checkbox de frasco/equipo automatico

* \[ ] Gerei requisicao com frasco/equipo automatico marcados
* \[ ] Os itens automaticos entraram
* \[ ] Gerei requisicao desmarcando frasco automatico
* \[ ] Frasco automatico nao entrou
* \[ ] Gerei requisicao desmarcando equipo automatico
* \[ ] Equipo automatico nao entrou
* \[ ] No sistema fechado, equipo saiu por bolsa
* \[ ] No sistema aberto, equipo saiu por 24h

## 11\. Lista Via/Terapia

* \[ ] Abri a lista Via/Terapia no faturamento
* \[ ] So apareceram "Enteral" e "Agua Espessada"
* \[ ] "Oral" nao apareceu
* \[ ] "Parenteral" nao apareceu

## 12\. Janela operacional 09:00 -> 03:00

* \[ ] Gerei requisicao/etiqueta a tarde (ex.: 16:00)
* \[ ] Inclui etapa de 09:00
* \[ ] A etapa de 09:00 saiu com data do dia seguinte
* \[ ] Testei horario 21:00
* \[ ] Testei horario 00:00
* \[ ] Testei horario 03:00
* \[ ] A logica de data operacional ficou correta

## 13\. Cancelamento manual / requisicao extra com varios itens

* \[ ] Abri o fluxo livre na tela principal
* \[ ] Adicionei varios itens
* \[ ] Consegui rolar a tela
* \[ ] Nao perdi os dados ao interagir com a tela
* \[ ] Removi item especifico da fila
* \[ ] O total somou corretamente
* \[ ] A guia foi gerada com todos os itens

## 14\. Etiquetas e requisicoes finais

* \[ ] Testei enteral fechado
* \[ ] Testei enteral aberto
* \[ ] Testei enteral em VO
* \[ ] Testei agua espessada
* \[ ] Testei agua de hidratacao
* \[ ] Horarios ficaram corretos
* \[ ] Data operacional ficou correta
* \[ ] Nome/codigo ficaram corretos
* \[ ] Nao houve frasco/equipo indevido em VO

## 15\. Resumo final

* \[ ] Tudo ok no codigo atual
* \[ ] Refiz os testes no codigo do Igor
* \[ ] O comportamento se manteve correto no codigo dele

## Observacoes

* Horario novo cadastrado na configuracao clinica apareceu na prescricao.
* Ao remover o horario na configuracao clinica, a prescricao atualizou automaticamente.
* Ao selecionar VO na enteral, o fluxo foi direto para sistema aberto e retirou as opcoes de bolus.
* Agua com espessante bloqueou o salvamento quando faltou selecao/preenchimento.
* Agua com espessante herdou corretamente os horarios da clinica.

- Observacao: no ambiente da usuaria, o preco unitario/subtotal da requisicao VO pode aparecer estranho, mas a regra funcional de nao incluir frasco/equipo ficou correta.

- Observacao: formula infantil passou a aparecer para paciente adulto com alerta visual persistente em tela.

- Observacao: a etiqueta mostrou "AGUA" e "Dieta: Agua para hidratacao 101 mL"; o codigo do insumo nao apareceu e ha dois cadastros de agua no ambiente.

- Observacao: no teste de 100 mL e 200 mL, a requisicao consolidada ficou praticamente igual; a classificacao por faixa de frasco nao ficou evidente. Em 500 mL houve mudanca de quantidade, mas nao de forma clara no esquema 0-100 / 101-300 / 301-500.

- Observacao: checkbox de frasco/equipo automatico respondeu corretamente no teste manual; faltam apenas cenarios especificos de sistema aberto/fechado para validar a regra fina por contexto.

- Observacao: teste manual da janela operacional confirmou `09:00` em 14/05/2026 quando a requisicao foi gerada em 13/05/2026 as 22:09.

- Observacao: edicao de paciente aberta a partir do mapa da clinica passou a retornar ao dashboard/mapa apos salvar ou fechar.

- Observacao: etiqueta de agua passou a exibir o nome do insumo no topo e o codigo no corpo.

- Observacao: a classificacao de frascos passou a aparecer explicitamente no consolidado por faixa de volume.

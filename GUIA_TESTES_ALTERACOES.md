# Guia de Testes das Alterações

Data de referência: 05/05/2026

Este guia foi pensado para validar as principais mudanças feitas no projeto sem depender de memória do que mudou em cada tela.

## Kit de teste criado

Cadastros criados/ajustados para facilitar os testes:

- Fórmulas
  - `TESTE - Fórmula Aberta 1.2 (500 mL)`
  - `TESTE - Fórmula Fechada 1.5 (1000 mL)`
  - `TESTE - Suplemento Oral 200 mL`
- Módulo
  - `TESTE - Módulo Proteico`
- Insumos
  - `TESTE - Água para Hidratação 500 mL`
  - `TESTE - Equipo Bomba`
  - `TESTE - Equipo Gravitacional`
  - `TESTE - Frasco Enteral`
  - `TESTE - Seringa/Bolus`

## 1. Validar formatação de preços

Telas:

- `Cadastros > Insumos`
- `Relatórios`

Verificar:

- Valores em reais aparecem como `R$ 10,00`, `R$ 25,50`, etc.
- Não aparece mais formato como `R$ 10.0000`.

## 2. Validar custo da água de hidratação

Pré-condição:

- usar o insumo `TESTE - Água para Hidratação 500 mL`
- valor esperado do frasco: `R$ 10,00`

Teste:

1. Criar ou editar uma prescrição enteral.
2. Informar `1600 mL` de hidratação no dia.
3. Salvar.
4. Ir em `Relatórios`.

Resultado esperado:

- o sistema cobra `4` frascos de `500 mL`
- total de água: `R$ 40,00`
- não pode aparecer `R$ 16.000,00`

## 3. Validar sistema fechado

Pré-condição:

- usar `TESTE - Fórmula Fechada 1.5 (1000 mL)`
- preço configurado: `R$ 0,08/mL`

Teste:

1. Criar prescrição enteral fechada.
2. Selecionar `1000 mL/dia`.
3. Usar bomba.
4. Salvar.

Resultado esperado:

- custo da fórmula: `R$ 80,00`
- se houver `1` bolsa/dia, enfermagem deve refletir `1` troca por bolsa
- não duplicar bolsa/equipo no relatório

## 4. Validar sistema aberto

Pré-condição:

- usar `TESTE - Fórmula Aberta 1.2 (500 mL)`

Teste:

1. Criar prescrição enteral aberta.
2. Informar `250 mL` em `4` horários.
3. Salvar.

Resultado esperado:

- material calculado pela fórmula
- equipo/frasco entram conforme o fluxo do aberto
- custo de enfermagem acompanha os horários/etapas

## 5. Validar via oral

Pré-condição:

- usar `TESTE - Suplemento Oral 200 mL`

Teste:

1. Criar prescrição oral com `200 mL` `1x/dia`.
2. Salvar.
3. Revisar resumo da prescrição.

Resultado esperado:

- custo material não zerado
- sem alerta indevido de faixa etária
- texto usando `Valor energético total`, sem `estimado`

## 6. Validar módulo

Pré-condição:

- usar `TESTE - Módulo Proteico`

Teste:

1. Adicionar o módulo em prescrição enteral.
2. Informar `20 g/dia`.
3. Salvar.

Resultado esperado:

- módulo aparece no custo material
- módulo aparece separado no resumo/relatório

## 7. Validar custo indireto e enfermagem

Teste:

1. Abrir uma prescrição enteral salva.
2. Conferir o bloco `Custos Diários`.

Resultado esperado:

- `Custo Material` maior que zero quando houver fórmula/módulo com preço
- `Custos de Enfermagem` maior que zero quando a configuração da unidade estiver preenchida
- `Custo indireto por paciente` maior que zero quando configurado
- `Custo total` precisa ser a soma exata dos três

## 8. Validar acompanhamento do Carlos

Teste:

1. Abrir o acompanhamento do Carlos.
2. Alterar o percentual do dia.
3. Salvar.
4. Reabrir a tela.

Resultado esperado:

- a tela deve mostrar o acompanhamento mais recente do dia
- não pode voltar automaticamente para um valor antigo só por causa da ordem de leitura

## 9. Validar mapa e impressão

Telas:

- `Mapa`
- `Etiquetas`

Verificar:

- data de nascimento em `DD/MM/AAAA`
- coluna `IMC<30` não aparece mais
- observações do mapa usam apenas os últimos `5` dias
- cada dia limitado a `90` caracteres
- impressão da etiqueta sem corte e com os dados clínicos corretos

## 10. Validar histórico e permissões

Teste:

1. Entrar com perfil nutricionista.
2. Abrir `Relatórios`.

Resultado esperado:

- `Histórico Assistencial` não deve aparecer para nutricionista
- deve continuar disponível para gestor

## 11. Validar requisição/manual

Teste:

1. Criar ajuste manual com paciente.
2. Criar ajuste manual sem paciente.
3. Criar ajuste manual sem horário.

Resultado esperado:

- fluxo deve aceitar `Sem paciente vinculado`
- quando não houver horário aplicável, usar `Não se aplica`
- guia manual precisa sair com ala, observações e valor

## 12. Validar textos finais

Passar rapidamente em:

- Prescrição
- Oral
- Relatórios
- Insumos
- Mapa

Verificar:

- não sobrou `estimado` onde não faz sentido
- `Prontuário` está padronizado
- `Observações` está padronizado
- moeda com vírgula e 2 casas na interface

## Observação importante

O paciente Carlos Roberto Gomes tem várias prescrições antigas ativas no banco local. Isso pode inflar relatórios se todas forem consideradas ao mesmo tempo. Se algum total parecer alto demais, conferir primeiro se o filtro está pegando mais de uma prescrição ativa do mesmo paciente.

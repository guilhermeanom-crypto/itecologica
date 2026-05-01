# CRM Interacoes V1

## Objetivo

Registrar o historico real de cada lead no CRM, sem depender apenas de observacao livre, e deixar a proxima acao combinada visivel para o time.

## O que esta etapa adiciona

- campos de `next_action` e `next_follow_up_at` no lead
- campos de `last_interaction_at` e `last_interaction_summary` no lead
- tabela `crm_lead_interactions` para o historico
- bloco no CRM para registrar cada interacao
- lista visivel do historico de contatos no detalhe do lead

## Banco

No Supabase SQL Editor, execute:

- `backend/supabase/crm_interactions_v1.sql`

Esse script:

- adiciona colunas operacionais em `crm_leads_public`
- cria a tabela `crm_lead_interactions`
- habilita `select` e `insert` para usuarios autenticados do CRM

## Fluxo esperado

1. o lead entra normalmente
2. o comercial abre o lead no CRM
3. ajusta status, responsavel e planejamento do follow-up
4. registra uma interacao com:
   - tipo
   - resultado
   - resumo
   - proxima acao
   - data do proximo follow-up
5. o CRM atualiza automaticamente:
   - ultima interacao
   - resumo da ultima interacao
   - proxima acao
   - follow-up agendado

## Comportamento automatico da V1

- se o lead estiver em `novo` e uma interacao real for registrada, o status passa para `em_contato`
- se ainda nao houver `first_contact_at`, a primeira interacao diferente de `nota_interna` marca esse campo

## Tipos iniciais de interacao

- `whatsapp`
- `ligacao`
- `email`
- `reuniao`
- `nota_interna`

## Resultados iniciais

- `sem_resposta`
- `retorno_agendado`
- `em_andamento`
- `qualificado`
- `proposta_enviada`
- `sem_interesse`
- `fechado`

## Proxima evolucao recomendada

Depois desta etapa, o proximo ganho mais natural e:

1. filtros por follow-up vencido
2. destaque para leads sem interacao
3. webhook do WhatsApp para registrar mensagens recebidas automaticamente

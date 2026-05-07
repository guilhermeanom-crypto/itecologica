# Fechamento Etapa Fluxo Oficial V1

## Objetivo da etapa

Consolidar a ITECOLOGICA como sistema oficial com fluxo coerente entre:

1. `home`
2. `CRM`
3. `Area do Analista`
4. `pipeline de diagnostico`
5. `revisao humana`

## Status documental

Este e um dos documentos centrais da etapa atual. Ele registra o criterio de aceite, o que foi consolidado e o que ainda falta para homologacao.

---

## O que foi fechado nesta etapa

### 1. Handoff oficial CRM -> Analista

- o CRM passou a abrir caso via `open-diagnosis-case`
- a Area do Analista passou a aceitar `case_id` por URL
- o caminho principal do diagnostico deixou de depender de busca manual por `lead_id`

### 2. Blindagem do pipeline

- `prepare-diagnosis-run` agora exige caso em `ready_to_run`
- o sistema impede execucoes paralelas no mesmo caso
- a abertura da run agora faz rollback em caso de falha parcial
- `ingest-diagnosis-step-output` agora aceita saida apenas da etapa `running`
- a ordem `agent_01 -> agent_02 -> agent_04 -> agent_03` passou a ser protegida no backend

### 3. Controle oficial de status do caso

- o frontend do Analista nao altera mais `status` livremente
- o status passou a ser resultado do fluxo oficial e das acoes de revisao

### 4. Mutações do Analista movidas para backend

- briefing do caso agora passa por `save-diagnosis-briefing`
- revisao humana agora passa por `review-diagnosis-case`

### 5. Mutações centrais do CRM movidas para backend

- atualizacao do lead agora passa por `update-crm-lead`
- registro de interacao agora passa por `create-crm-lead-interaction`

---

## Edge functions que precisam estar publicadas

- `create-public-lead`
- `open-diagnosis-case`
- `prepare-diagnosis-run`
- `ingest-diagnosis-step-output`
- `generate-canonical-diagnosis`
- `save-diagnosis-briefing`
- `review-diagnosis-case`
- `update-crm-lead`
- `create-crm-lead-interaction`

---

## Checklist de publicacao no Supabase oficial

O roteiro operacional detalhado ficou em:

- [PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md)

### Banco

- aplicar `backend/supabase/schema.sql`
- aplicar `backend/supabase/crm_panel_v1.sql`
- aplicar `backend/supabase/crm_interactions_v1.sql`
- aplicar `backend/supabase/diagnosis_v1.sql`

### Edge functions

- publicar todas as functions oficiais da lista acima
- revisar `ALLOWED_ORIGINS`
- revisar `SUPABASE_SERVICE_ROLE_KEY`
- revisar `TURNSTILE_SECRET_KEY`
- revisar variaveis do WhatsApp se a automacao de primeiro contato estiver ativa

### Frontends

- `app/config.js` apontando para `create-public-lead`
- `crm/config.js` apontando para o projeto Supabase oficial
- `analista/config.js` apontando para o projeto Supabase oficial

### Seed opcional para demo do Analista

- [SEED_ANALISTA_DEMO_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/SEED_ANALISTA_DEMO_V1.md)

---

## Validacao ponta a ponta

### Fluxo 1 - Captacao publica

1. abrir a home oficial
2. enviar um lead valido
3. confirmar gravacao em `crm_leads_public`
4. confirmar exibicao do lead no CRM

### Fluxo 2 - Operacao comercial

1. abrir o lead no CRM
2. atualizar status, responsavel e follow-up
3. registrar uma interacao
4. confirmar atualizacao de:
   - `last_interaction_at`
   - `last_interaction_summary`
   - `next_action`
   - `next_follow_up_at`

### Fluxo 3 - Handoff para diagnostico

1. no CRM, clicar em `Encaminhar para Diagnóstico`
2. confirmar criacao ou reaproveitamento de `crm_diagnosis_cases`
3. abrir a Area do Analista pelo caso

### Fluxo 4 - Diagnostico operacional

1. salvar briefing
2. gerar diagnostico canonico
3. confirmar caso em `ready_to_run`
4. preparar execucao
5. confirmar criacao da run e das etapas

### Fluxo 5 - Pipeline

1. registrar saida de `agent_01`
2. confirmar promocao de `agent_02`
3. tentar registrar etapa fora de ordem e confirmar bloqueio
4. concluir `agent_02`, `agent_04` e `agent_03`
5. confirmar `final_output`
6. confirmar caso em `awaiting_human_review`

### Fluxo 6 - Revisao humana

1. aprovar caso e confirmar `approved`
2. reabrir caso e confirmar `ready_to_run`
3. rejeitar caso e confirmar `rejected`

---

## Critério para considerar esta etapa concluída

Esta etapa pode ser considerada encerrada quando:

- todas as edge functions novas estiverem publicadas
- os fluxos 1 a 6 forem validados no ambiente oficial
- nao houver mais mutacao central de lead, briefing, revisao ou interacao feita direto do frontend

---

## Proxima etapa

Depois deste fechamento, a proxima etapa oficial deve atacar:

1. limpeza dos bypasses restantes e leituras sensiveis
2. deduplicacao de leads
3. publicacao oficial reprodutivel dos frontends
4. integracao do fechamento tecnico com proposta e continuidade comercial

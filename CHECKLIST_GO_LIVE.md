# Checklist Go Live Sistema Central V1

## Papel deste arquivo

Este checklist existe para validar a entrada em operacao do fluxo oficial atual da ITECOLOGICA:

1. `home`
2. `CRM`
3. `Area do Analista`
4. `pipeline de diagnostico`
5. `revisao humana`

Se houver duvida de contexto, consultar primeiro:

- [docs/MAPA_SISTEMA_CENTRAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_SISTEMA_CENTRAL_V1.md)
- [docs/ORQUESTRACAO_HABILIS_ITECOLOGICA_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/ORQUESTRACAO_HABILIS_ITECOLOGICA_V1.md)
- [docs/PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md)
- [docs/FECHAMENTO_ETAPA_FLUXO_OFICIAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/FECHAMENTO_ETAPA_FLUXO_OFICIAL_V1.md)

## Estrutura oficial validada

- `app/` definido como home oficial
- `crm/` definido como CRM oficial
- `analista/` definido como Area do Analista oficial
- `backend/supabase/` definido como backend oficial
- `app/crm/` removido do fluxo oficial
- `analista_v2/` tratado como trilha futura, fora da operacao atual

## Pre-condicoes de publicacao

- projeto Supabase oficial confirmado: `cixgnglubgczawnfyspw`
- `schema.sql` aplicado
- `crm_panel_v1.sql` aplicado
- `crm_interactions_v1.sql` aplicado
- `diagnosis_v1.sql` aplicado
- `ALLOWED_ORIGINS` revisado
- `SUPABASE_SERVICE_ROLE_KEY` revisada
- `TURNSTILE_SECRET_KEY` revisada
- usuario interno valido em `crm_internal_users`

## Edge functions oficiais publicadas

- `create-public-lead`
- `open-diagnosis-case`
- `prepare-diagnosis-run`
- `ingest-diagnosis-step-output`
- `generate-canonical-diagnosis`
- `save-diagnosis-briefing`
- `review-diagnosis-case`
- `update-crm-lead`
- `create-crm-lead-interaction`

## Frontends apontando para a base oficial

- `app/config.js` apontando para `create-public-lead`
- `crm/config.js` apontando para o Supabase oficial
- `analista/config.js` apontando para o Supabase oficial

## Homologacao do fluxo oficial

### Fluxo 1 - Captacao publica

- abrir a home oficial
- enviar um lead valido
- confirmar gravacao em `crm_leads_public`
- confirmar exibicao do lead no CRM

### Fluxo 2 - Operacao comercial

- abrir o lead no CRM
- atualizar status, responsavel e follow-up
- registrar uma interacao
- confirmar atualizacao de `last_interaction_at`
- confirmar atualizacao de `last_interaction_summary`
- confirmar atualizacao de `next_action`
- confirmar atualizacao de `next_follow_up_at`

### Fluxo 3 - Handoff para diagnostico

- no CRM, clicar em `Encaminhar para Diagnóstico`
- confirmar criacao ou reaproveitamento de `crm_diagnosis_cases`
- abrir a Area do Analista pelo caso

### Fluxo 4 - Diagnostico operacional

- salvar briefing
- gerar diagnostico canonico
- confirmar caso em `ready_to_run`
- preparar execucao
- confirmar criacao da run
- confirmar criacao das etapas

### Fluxo 5 - Pipeline

- registrar saida de `agent_01`
- confirmar promocao de `agent_02`
- tentar registrar etapa fora de ordem e confirmar bloqueio
- concluir `agent_02`
- concluir `agent_04`
- concluir `agent_03`
- confirmar `final_output`
- confirmar caso em `awaiting_human_review`

### Fluxo 6 - Revisao humana

- aprovar caso e confirmar status `approved`
- rejeitar caso de teste e confirmar status `rejected`
- reabrir caso e confirmar retorno ao fluxo permitido

## Seeds e apoio de demonstracao

- seed opcional disponivel em [docs/SEED_ANALISTA_DEMO_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/SEED_ANALISTA_DEMO_V1.md)

## Quando considerar esta etapa pronta

- o fluxo `home -> CRM -> Analista -> pipeline -> revisao` roda sem trilha paralela
- as mutacoes centrais passam pelas edge functions oficiais
- nao existe modulo duplicado competindo com a superficie oficial
- a equipe consegue identificar com clareza o que e oficial, o que e apoio e o que e trilha futura

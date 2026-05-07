# Seed Analista Demo V1

## Status documental

Documento de apoio para demonstracao e teste local/assistido. Nao faz parte obrigatoria da operacao oficial.

## Objetivo

Criar 5 leads fictícios já ligados à trilha de diagnóstico para testar a Area do Analista sem depender de captação real.

## Arquivo

- [backend/supabase/seed_analista_demo_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/seed_analista_demo_v1.sql)

## O que o seed cria

1. `Lead 01` com caso em `collecting_inputs`
2. `Lead 02` com caso em `ready_to_run`
3. `Lead 03` com caso em `running`
4. `Lead 04` com caso em `awaiting_human_review`
5. `Lead 05` com caso em `approved`

Também cria:

- entradas estruturadas em `crm_diagnosis_inputs`
- runs para os casos em andamento e concluídos
- steps correspondentes
- artefatos canônicos para casos úteis de teste

## Ordem de uso

Aplicar somente depois de:

1. `backend/supabase/schema.sql`
2. `backend/supabase/crm_panel_v1.sql`
3. `backend/supabase/crm_interactions_v1.sql`
4. `backend/supabase/diagnosis_v1.sql`

Depois:

5. aplicar `backend/supabase/seed_analista_demo_v1.sql`

## Onde testar

- `CRM`: abrir os leads para validar handoff e contexto comercial
- `Area do Analista`: validar as filas de caso, execução, revisão e artefatos

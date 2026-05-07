# Orquestração Hábilis + Itecológica V1

## Objetivo

Conectar o motor metodológico do `HABILIS_AI` ao fluxo operacional da `ITECOLOGICA`, sem expor a lógica no frontend e sem depender de execução manual desorganizada.

## Status documental

Este e um dos documentos centrais da etapa atual. Ele descreve o fluxo oficial vivo do diagnostico dentro da ITECOLOGICA.

O ponto de partida oficial de modulos, ownership e trilha canonica do sistema esta em:

- [MAPA_SISTEMA_CENTRAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_SISTEMA_CENTRAL_V1.md)
- [MAPA_TRANSPLANTACAO_OFICIAL_DIAGNOSTICO_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_TRANSPLANTACAO_OFICIAL_DIAGNOSTICO_V1.md)

Nesta V1, a orquestração foi estruturada em torno de:

- lead no CRM
- handoff para a area do Analista
- caso de diagnóstico
- entrada estruturada do caso
- execução versionada do pipeline
- etapas rastreáveis por agente
- saída consolidada para revisão humana

---

## Onde está cada parte

### Motor metodológico

Origem atual:

- [HABILIS_AI/agentes/agente_01_coletor.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_01_coletor.txt)
- [HABILIS_AI/agentes/agente_02_estruturador.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_02_estruturador.txt)
- [HABILIS_AI/agentes/agente_04_auditor.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_04_auditor.txt)
- [HABILIS_AI/agentes/agente_03_operacional.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_03_operacional.txt)
- [HABILIS_AI/modelos/base_modelo_conhecimento.json](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/modelos/base_modelo_conhecimento.json)

### Estrutura nova na Itecológica

- area do Analista:
  [analista/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/index.html)
- schema do diagnóstico:
  [backend/supabase/diagnosis_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/diagnosis_v1.sql)
- abrir caso:
  [backend/supabase/functions/open-diagnosis-case/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/open-diagnosis-case/index.ts)
- preparar execução:
  [backend/supabase/functions/prepare-diagnosis-run/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/prepare-diagnosis-run/index.ts)
- registrar saída de etapa:
  [backend/supabase/functions/ingest-diagnosis-step-output/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/ingest-diagnosis-step-output/index.ts)
- atualizar lead do CRM no backend:
  [backend/supabase/functions/update-crm-lead/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/update-crm-lead/index.ts)
- registrar interação do CRM no backend:
  [backend/supabase/functions/create-crm-lead-interaction/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/create-crm-lead-interaction/index.ts)
- gerar diagnostico canonico no backend:
  [backend/supabase/functions/generate-canonical-diagnosis/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/generate-canonical-diagnosis/index.ts)
- assets metodologicos internalizados:
  [backend/assets/habilis/README.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/assets/habilis/README.md)
- salvar briefing do caso no backend:
  [backend/supabase/functions/save-diagnosis-briefing/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/save-diagnosis-briefing/index.ts)
- revisar o caso no backend:
  [backend/supabase/functions/review-diagnosis-case/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/review-diagnosis-case/index.ts)
- utilitários compartilhados:
  [backend/supabase/functions/_shared/diagnosis.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/_shared/diagnosis.ts)
- motor compartilhado para edge functions do diagnostico:
  [backend/supabase/functions/_shared/official-diagnostic.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/_shared/official-diagnostic.ts)
- tipos, fluxo e decisao transplantados:
  [backend/domain/diagnostic/types.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/types.ts),
  [backend/domain/diagnostic/process-flow.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/process-flow.ts),
  [backend/domain/diagnostic/decision-engine.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/decision-engine.ts),
  [backend/domain/diagnostic/canonical-diagnostic.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/canonical-diagnostic.ts),
  [backend/domain/diagnostic/official-diagnostic-engine.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/official-diagnostic-engine.ts),
  [backend/domain/diagnostic/official-execution-plan.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/official-execution-plan.ts)

Observacao de consolidacao:

- `analista/` continua sendo a superficie operacional oficial
- `analista_v2/` nao entra no fluxo atual e deve ser tratado apenas como trilha futura
- a geracao canonica agora materializa `3 artefatos oficiais`:
  - `canonical_diagnosis_json`
  - `official_diagnostic_result_json`
  - `official_execution_plan_json`
- a area do Analista passa a expor esses tres blocos no detalhe do caso

---

## Modelo de dados

As tabelas novas são:

- `crm_diagnosis_cases`
- `crm_diagnosis_inputs`
- `crm_diagnosis_documents`
- `crm_diagnosis_runs`
- `crm_diagnosis_run_steps`
- `crm_diagnosis_artifacts`

### Papel de cada tabela

- `crm_diagnosis_cases`: representa o caso ligado a um lead.
- `crm_diagnosis_inputs`: guarda versões da entrada estruturada do caso.
- `crm_diagnosis_documents`: indexa documentos anexados.
- `crm_diagnosis_runs`: registra cada execução do pipeline.
- `crm_diagnosis_run_steps`: rastreia cada agente como etapa independente.
- `crm_diagnosis_artifacts`: reserva espaço para HTML, PDF, JSON final e outros artefatos.

---

## Sequência operacional

### 1. Lead entra no CRM

Origem:

- `crm_leads_public`

### 2. CRM qualifica e encaminha

O CRM nao executa o diagnostico.

Ele apenas:

- recebe o lead
- qualifica o interesse
- registra historico comercial
- encaminha o lead para a area do Analista

### 3. Área do Analista abre o caso

Edge function:

- `open-diagnosis-case`

Entrada esperada:

```json
{
  "lead_id": "uuid-do-lead",
  "diagnosis_type": "regularizacao_ambiental",
  "briefing_summary": "demanda principal do caso",
  "theme": "regularizacao ambiental",
  "territorial_scope": "Iturama/MG"
}
```

Efeito:

- cria `crm_diagnosis_cases`
- cria primeira versão em `crm_diagnosis_inputs`
- marca o lead como `em_diagnostico`

Observacao:

- os nomes tecnicos ainda usam prefixo `crm_` por continuidade da V1
- a operacao do diagnostico deve acontecer na area do Analista, e nao dentro do CRM

### 4. Área do Analista prepara a execução

Edge function:

- `prepare-diagnosis-run`

Entrada esperada:

```json
{
  "case_id": "uuid-do-caso",
  "model_provider": "manual",
  "model_name": "habilis-pipeline-v1",
  "execution_mode": "manual"
}
```

Efeito:

- cria uma linha em `crm_diagnosis_runs`
- gera `pipeline_manifest`
- cria as etapas em `crm_diagnosis_run_steps`
- coloca o caso em `running`

### 5. Área do Analista registra a saída de cada etapa

Edge function:

- `ingest-diagnosis-step-output`

Entrada esperada:

```json
{
  "run_id": "uuid-da-execucao",
  "step_code": "agent_01",
  "status": "completed",
  "output_payload": {
    "meta": {},
    "base_oficial": {}
  }
}
```

Efeito:

- grava saída da etapa
- avança a próxima etapa para `running`
- recalcula o estado da execução
- quando todas as etapas forem concluídas:
  - consolida `final_output`
  - move a execução para `awaiting_human_review`
  - move o caso para `awaiting_human_review`

---

## Ordem do pipeline

A sequência adotada respeita a estrutura do `HABILIS_AI`:

1. `agent_01`
2. `agent_02`
3. `agent_04`
4. `agent_03`

### Motivo da ordem

- `agent_01` coleta a base oficial.
- `agent_02` enquadra a partir dessa base.
- `agent_04` audita o enquadramento antes de operacionalizar.
- `agent_03` só entra depois da auditoria.

Isso preserva a disciplina metodológica do Hábilis dentro do fluxo da Itecológica.

---

## O que já está orquestrado

- caso de diagnóstico rastreável
- versionamento da entrada
- execução com número incremental
- etapas separadas por agente
- transição de estado do caso e da execução
- trava para impedir execuções paralelas no mesmo caso
- trava para registrar saída apenas na etapa ativa da run corrente
- consolidação da saída final
- geração canônica do diagnóstico no backend como artefato estruturado
- acionamento desse diagnóstico canônico pela Area do Analista
- handoff do CRM oficial para a Area do Analista via `open-diagnosis-case`
- aprovação, rejeição e reabertura do caso direto na Area do Analista
- status do caso controlado pelo fluxo oficial, sem edição manual livre no frontend
- briefing e revisão humana passando por edge functions oficiais, sem update direto de tabela no frontend do Analista
- mutações centrais do CRM passando por edge functions oficiais, sem update direto de lead/interação no frontend
- política de acesso restrita a usuário interno do CRM

Em termos de produto, o desenho correto e:

- CRM para comercial
- area do Analista para diagnostico

---

## O que ainda falta para fechar a operação

- upload real dos documentos no storage
- OCR e indexação de anexos
- aprofundar a UI da area do Analista para operar casos vindos do CRM, disparar run e acompanhar etapas
- executor automático conectado a modelo/API
- geração de HTML/PDF a partir do `final_output`
- refletir aprovação ou rejeição humana integrada no fechamento comercial e proposta

---

## Ordem de implantação recomendada

1. aplicar `schema.sql`
2. aplicar `crm_panel_v1.sql`
3. aplicar `diagnosis_v1.sql`
4. publicar as edge functions novas
5. integrar o CRM apenas no handoff do lead
6. integrar a area do Analista com:
   - `open-diagnosis-case`
   - `prepare-diagnosis-run`
   - `ingest-diagnosis-step-output`

---

## Leitura estratégica

Com essa V1, o `HABILIS_AI` deixa de ser um conjunto solto de prompts e passa a existir como pipeline operacional dentro da Itecológica.

O site continua sendo porta de entrada.

---

## Plano de reaproveitamento

O detalhamento do que deve ser copiado do prototipo original para a nova Area do Analista ficou consolidado em:

- [PLANO_TRANSPLANTACAO_AREA_ANALISTA_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/PLANO_TRANSPLANTACAO_AREA_ANALISTA_V1.md)

Esse plano assume uma regra simples:

- preservar o prototipo original
- copiar apenas os blocos maduros
- transplantar para um nucleo novo da Itecológica
O CRM continua sendo camada comercial.
A area do Analista vira o cockpit humano do diagnostico.
E o diagnóstico passa a ter trilha rastreável, versionada e revisável.

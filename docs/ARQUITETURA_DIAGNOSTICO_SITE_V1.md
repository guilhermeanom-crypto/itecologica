# Arquitetura Diagnostico Site V1

## Status documental

Documento de apoio arquitetural. Serve como referencia de desenho e contexto, mas nao substitui o `MAPA`, a `ORQUESTRACAO` nem o roteiro de `PUBLICACAO`.

> **Atencao - leitura mista V1 x Fase 2+.**
> Este documento descreve tanto o que ja foi implementado na V1 quanto o desenho previsto para a Fase 2+. Antes de tomar qualquer decisao de implementacao, conferir a secao "Status de implementacao" abaixo. A fonte canonica da V1 viva continua sendo o `MAPA_SISTEMA_CENTRAL_V1`.

## Status de implementacao

### Implementado e em producao na V1

Tabelas:

- `crm_diagnosis_cases`
- `crm_diagnosis_inputs`
- `crm_diagnosis_documents`
- `crm_diagnosis_runs`
- `crm_diagnosis_run_steps`
- `crm_diagnosis_artifacts`

Edge functions:

- `create-public-lead`
- `update-crm-lead`
- `create-crm-lead-interaction`
- `open-diagnosis-case`
- `prepare-diagnosis-run`
- `save-diagnosis-briefing`
- `ingest-diagnosis-step-output`
- `generate-canonical-diagnosis`
- `review-diagnosis-case`

Pipeline real: `agent_01 -> agent_02 -> agent_04 -> agent_03 -> awaiting_human_review`.

### Desenho planejado (Fase 2+, ainda nao implementado)

As secoes adiante descrevem componentes que NAO existem na V1 atual e devem ser tratados como design futuro:

- Tabela `crm_diagnosis_reports` (artefatos HTML/PDF separados de `crm_diagnosis_artifacts`)
- Tabela `crm_diagnosis_proposals` (estrutura comercial derivada do diagnostico)
- Edge functions `create-diagnosis-case`, `upload-diagnosis-document`, `start-diagnosis-run`, `run-diagnosis-pipeline`, `generate-diagnosis-report`, `generate-diagnosis-proposal`
- Buckets de storage `diagnosis-inputs`, `diagnosis-reports`, `diagnosis-proposals`
- Templates por tipo de diagnostico (regularizacao, mapeamento, PGRSS, estanqueidade, logistica reversa, posto, gestao)
- Geracao de relatorio HTML/PDF e proposta comercial automatizada

A V1 atual consolida o resultado em `crm_diagnosis_artifacts` (3 JSONs canonicos: `canonical_diagnosis_json`, `official_diagnostic_result_json`, `official_execution_plan_json`) e a edge function ativa para isso e a `generate-canonical-diagnosis`. Quando a Fase 2+ for aberta, o desenho deste documento entra como base.

## Objetivo

Trazer o motor de diagnostico ja existente em `HABILIS_AI` para dentro do ambiente publicado da Itecologica, sem reescrever a metodologia e sem acoplar tudo ao frontend estatico.

Antes de evoluir novos modulos, a referencia oficial de quais componentes sao centrais, legados ou ainda experimentais ficou consolidada em:

- [MAPA_SISTEMA_CENTRAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_SISTEMA_CENTRAL_V1.md)

O objetivo desta V1 e permitir:

1. lead qualificado no CRM
2. abertura de caso diagnostico
3. coleta complementar de dados e documentos
4. execucao do pipeline de diagnostico
5. geracao de relatorio
6. estruturacao de proposta de gestao
7. aprovacao humana antes de envio ao cliente

---

## O que ja existe e deve ser reaproveitado

### Itecologica

- `app/`: home publica oficial e captacao
- `crm/`: CRM comercial oficial
- `analista/`: Area do Analista oficial
- `backend/supabase/schema.sql`: base de leads
- `backend/supabase/crm_panel_v1.sql`: acesso interno ao CRM
- `backend/supabase/crm_interactions_v1.sql`: historico, proxima acao e follow-up
- `backend/supabase/functions/create-public-lead/index.ts`: entrada segura do lead

### HABILIS_AI

- `agentes/agente_01_coletor.txt`: coleta normativa
- `agentes/agente_02_estruturador.txt`: enquadramento
- `agentes/agente_03_operacional.txt`: operacionalizacao, servico e precificacao
- `agentes/agente_04_auditor.txt`: auditoria tecnica
- `modelos/base_modelo_conhecimento.json`: estrutura-base de saida
- `scripts/generate_regularizacao_report.py`: relatorio HTML de regularizacao
- `scripts/generate_regiao_report.py`: relatorio HTML territorial
- `output_*.json`: casos reais ja processados

### Bases especializadas para plugar depois

- `Estanqueidade/`: matriz regulatoria, POPs, checklists e modelos de laudo
- `Posto/`: arquitetura modular e base operacional por dominio
- `Logística Reversa/`: conteudo consolidado e material de referencia

---

## Decisao arquitetural central

Nao trazer o motor de diagnostico para o frontend.

O site continuara:

- publico na Vercel
- simples no frontend
- sem segredo exposto

O diagnostico deve rodar no backend do Supabase, usando:

- tabelas para estado
- storage para documentos e artefatos
- edge functions para orquestracao
- area do Analista como cockpit humano do diagnostico

Em termos práticos:

- Vercel entrega interface
- Supabase guarda estado, arquivos e execucao
- o motor metodologico do `HABILIS_AI` vira pipeline de backend
- o CRM apenas qualifica e encaminha o lead para o diagnostico

O plano objetivo de transplantacao dos blocos maduros do prototipo para a nova Area do Analista ficou registrado em:

- [PLANO_TRANSPLANTACAO_AREA_ANALISTA_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/PLANO_TRANSPLANTACAO_AREA_ANALISTA_V1.md)

A primeira camada dessa transplantacao ja foi aberta em:

- [backend/domain/diagnostic/types.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/types.ts)
- [backend/domain/diagnostic/process-flow.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/process-flow.ts)
- [backend/domain/diagnostic/decision-engine.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/decision-engine.ts)
- [backend/domain/diagnostic/canonical-diagnostic.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/canonical-diagnostic.ts)
- [backend/supabase/functions/generate-canonical-diagnosis/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/generate-canonical-diagnosis/index.ts)

Neste momento, `analista_v2/` deve ser tratado apenas como trilha futura de consolidacao. A operacao oficial continua em `analista/`.

---

## Arquitetura alvo

```text
Lead entra no site
  -> crm_leads_public
  -> CRM qualifica
  -> CRM encaminha para a area do Analista
  -> analista clica "Abrir diagnostico"
  -> cria caso diagnostico
  -> coleta dados complementares
  -> sobe documentos
  -> dispara pipeline
  -> pipeline executa agentes 01 > 02 > 04 > 03
  -> consolida JSON final
  -> gera relatorio HTML/PDF
  -> gera estrutura de proposta
  -> humano revisa
  -> libera para envio
```

---

## Componentes da V1

### 1. CRM como origem comercial e area do Analista como origem operacional

O CRM atual continua sendo a porta de entrada comercial.

O diagnostico nao deve morar dentro do CRM.

Ele deve morar em uma area propria do Analista, com identidade e fluxo operacional separados.

Novo fluxo recomendado:

- CRM qualifica o lead
- CRM envia o lead para a area do Analista
- area do Analista abre o caso diagnostico
- area do Analista conduz briefing, documentos, execucao e revisao

Fluxo da area do Analista:

- botao `Abrir diagnostico`
- selecao do tipo de diagnostico
- formulario de briefing complementar
- upload de documentos
- visualizacao de status da execucao
- leitura do relatorio final
- aprovacao ou reprova do diagnostico

O CRM deve continuar com foco em:

- captura
- qualificacao
- historico comercial
- follow-up
- handoff para o diagnostico

### 2. Tipos de diagnostico

A V1 nao deve tentar cobrir tudo de uma vez.

Tipos iniciais recomendados:

- `regularizacao_ambiental`
- `mapeamento_normativo_territorial`
- `pgrss`

Tipos posteriores:

- `estanqueidade`
- `logistica_reversa`
- `posto_gestao_ambiental`

### 3. Banco de dados

Novas tabelas recomendadas:

#### `crm_diagnosis_cases`

Representa o caso diagnostico ligado a um lead.

Campos principais:

- `id`
- `lead_id`
- `diagnosis_type`
- `title`
- `status`
- `priority`
- `requested_by_email`
- `assigned_to`
- `briefing_summary`
- `human_review_required`
- `approved_at`
- `approved_by_email`
- `created_at`
- `updated_at`

Status sugeridos:

- `draft`
- `collecting_inputs`
- `ready_to_run`
- `running`
- `awaiting_human_review`
- `approved`
- `rejected`
- `archived`

#### `crm_diagnosis_inputs`

Guarda a entrada estruturada do caso.

Campos:

- `id`
- `case_id`
- `theme`
- `territorial_scope`
- `customer_context`
- `declared_need`
- `known_constraints`
- `json_payload`
- `created_at`

#### `crm_diagnosis_documents`

Indexa os documentos anexados ao caso.

Campos:

- `id`
- `case_id`
- `file_name`
- `file_path`
- `document_type`
- `source`
- `source_url`
- `uploaded_by_email`
- `ocr_status`
- `extracted_text`
- `created_at`

#### `crm_diagnosis_runs`

Registra cada execucao do pipeline.

Campos:

- `id`
- `case_id`
- `run_number`
- `status`
- `started_at`
- `finished_at`
- `error_message`
- `model_provider`
- `model_name`
- `created_by_email`

Status (alinhado ao schema real em `backend/supabase/diagnosis_v1.sql`):

- `queued`
- `running_agent_01`
- `running_agent_02`
- `running_agent_04`
- `running_agent_03`
- `awaiting_outputs`
- `awaiting_human_review`
- `completed`
- `failed`
- `cancelled`

#### `crm_diagnosis_run_steps`

Guarda cada etapa do pipeline separadamente.

Campos:

- `id`
- `run_id`
- `step_key`
- `status`
- `input_json`
- `output_json`
- `started_at`
- `finished_at`
- `error_message`

Passos:

- `agent_01_collect`
- `agent_02_frame`
- `agent_04_audit`
- `agent_03_operationalize`
- `final_merge`
- `report_generation`

#### `crm_diagnosis_reports`

Artefatos finais.

Campos:

- `id`
- `case_id`
- `run_id`
- `report_type`
- `html_path`
- `pdf_path`
- `json_path`
- `version_label`
- `created_at`

#### `crm_diagnosis_proposals`

Estrutura comercial derivada do diagnostico.

Campos:

- `id`
- `case_id`
- `run_id`
- `service_description`
- `scope_json`
- `deliverables_json`
- `scope_limits_json`
- `pricing_model`
- `pricing_variables_json`
- `price_range_text`
- `proposal_status`
- `html_path`
- `pdf_path`
- `created_at`

### 4. Storage

Buckets recomendados:

- `diagnosis-inputs`
- `diagnosis-reports`
- `diagnosis-proposals`

Uso:

- `diagnosis-inputs`: arquivos do cliente, laudos, certidoes, licencas, matriculas
- `diagnosis-reports`: JSON consolidado, HTML e PDF do diagnostico
- `diagnosis-proposals`: proposta derivada do diagnostico

### 5. Edge functions

#### `create-diagnosis-case`

Cria o caso a partir do CRM.

Responsabilidades:

- validar permissao do usuario interno
- criar `crm_diagnosis_cases`
- criar `crm_diagnosis_inputs`
- opcionalmente registrar interacao no lead

#### `upload-diagnosis-document`

Entrega URL assinada ou registra upload.

Responsabilidades:

- validar acesso
- vincular arquivo ao caso
- registrar metadados em `crm_diagnosis_documents`

#### `start-diagnosis-run`

Dispara uma nova execucao.

Responsabilidades:

- validar se o caso esta pronto
- criar linha em `crm_diagnosis_runs`
- enfileirar execucao

#### `run-diagnosis-pipeline`

Orquestrador real do motor.

Responsabilidades:

- montar input do caso
- carregar prompt do agente 01
- executar e salvar output
- alimentar agente 02 com output do 01
- alimentar agente 04 com output do 02
- alimentar agente 03 com 01, 02 e 04
- consolidar saida final
- mudar status do caso

#### `generate-diagnosis-report`

Transforma JSON final em HTML e PDF.

Responsabilidades:

- detectar template por tipo
- renderizar HTML
- salvar artefato
- opcionalmente converter para PDF

#### `generate-diagnosis-proposal`

Transforma a secao `servico` e `precificacao` em proposta comercial.

Responsabilidades:

- montar proposta padronizada
- aplicar identidade visual
- gerar HTML e PDF
- salvar em `crm_diagnosis_proposals`

---

## Ordem do pipeline

Ordem recomendada:

1. `agent_01_coletor`
2. `agent_02_estruturador`
3. `agent_04_auditor`
4. `agent_03_operacional`

Motivo:

- primeiro coleta base
- depois enquadra
- depois audita
- so depois operacionaliza

Isso preserva a logica que ja existe nos prompts.

---

## Regras de bloqueio da V1

O sistema nao deve gerar parecer final livremente quando:

- `auditoria.nivel_risco = alto`
- `auditoria.status_validacao = reprovado`
- faltarem documentos obrigatorios do tipo
- nao houver briefing minimo

Nesses casos:

- o caso vai para `awaiting_human_review`
- o CRM mostra bloqueio
- o usuario interno revisa antes de liberar qualquer relatorio externo

---

## Como isso entra no site

### Area publica

Permanece como esta:

- `/`
- landing
- formulario
- entrada do lead

### Area interna

O CRM em `/crm/` ganha uma nova camada:

- aba `Diagnosticos`
- no detalhe do lead: botao `Abrir diagnostico`

### Paginas internas sugeridas

- `/crm/` -> lista de leads
- `/crm/?view=diagnosticos` -> fila de diagnosticos
- `/crm/?case=<id>` -> detalhe do caso diagnostico

Como o frontend atual e estatico, a V1 pode manter isso em uma unica SPA simples dentro do proprio CRM.

---

## O que falta no sistema atual para essa arquitetura funcionar

1. tabelas de diagnostico
2. upload de documentos
3. orquestrador real dos agentes
4. armazenamento dos outputs por caso
5. tela de diagnostico no CRM
6. gerador padronizado de proposta
7. trilha de aprovacao humana

---

## Gaps tecnicos mais importantes

### Gap 1. O motor ainda esta em formato de laboratorio

Hoje existem:

- prompts
- exemplos de output
- scripts de relatorio

Ainda nao existe:

- pipeline backend executando sozinho por caso

### Gap 2. Falta ingestao documental

Sem isso, o diagnostico fica limitado a briefing textual.

### Gap 3. Falta estado persistente por caso

Hoje ha outputs prontos em pasta, mas nao ha:

- versionamento por cliente
- rerun controlado
- historico de execucoes

### Gap 4. Falta proposta final padronizada

Ja existe secao de `servico` e `precificacao`, mas nao um gerador final de proposta comercial institucional.

### Gap 5. Falta revisao humana explicita no fluxo

O metodo pede isso. O produto precisa refletir isso.

---

## Implementacao recomendada em fases

### Fase 1. Diagnostico manual assistido

Entregar:

- tabelas
- caso diagnostico
- upload de documentos
- armazenamento de briefing
- geracao manual do JSON consolidado
- visualizacao do relatorio no CRM

Objetivo:

- colocar o fluxo real em operacao sem automatizar tudo

### Fase 2. Pipeline automatizado

Entregar:

- edge function orquestradora
- execucao sequencial dos agentes
- gravacao de output por etapa
- bloqueio por auditoria

Objetivo:

- transformar o metodo em sistema repetivel

### Fase 3. Proposta automatica

Entregar:

- template padrao de proposta
- campos de servico e precificacao
- exportacao HTML/PDF

Objetivo:

- sair do diagnostico para a proposta sem retrabalho manual

### Fase 4. Especializacao por dominio

Entregar:

- tipo `estanqueidade`
- tipo `logistica_reversa`
- tipo `posto_gestao_ambiental`

Objetivo:

- plugar as bases especializadas que voce ja tem

---

## Recomendacao final

Nao tentar plugar todo o `HABILIS_AI` de uma vez.

A V1 correta para o site e:

1. criar o modulo `Diagnosticos` no CRM
2. modelar `case`, `run`, `report` e `proposal`
3. rodar primeiro um unico tipo: `regularizacao_ambiental`
4. exigir revisao humana
5. depois expandir para os outros dominios

Assim voce traz o que ja existe para o site sem perder controle nem qualidade.

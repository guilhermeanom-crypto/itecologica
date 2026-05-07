# Plano de Transplantacao da Area do Analista V1

## Status documental

Documento de trilha futura. Serve como referencia de reaproveitamento e transplantacao, mas nao participa do fluxo oficial vivo desta etapa.

## Objetivo

Definir o que deve ser copiado do prototipo existente para a nova Area do Analista da `ITECOLOGICA`, preservando o prototipo original como referencia historica.

Principio central:

- copiar, nao mover
- preservar o original intacto
- transplantar apenas o que agrega valor estrutural
- substituir persistencia e mocks por backend real da Itecológica

---

## Fontes principais

### Prototipo operacional mais maduro

- [INTERFACE/enviro-clarity-main/src/pages/DiagnosticoPage.tsx](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/pages/DiagnosticoPage.tsx)
- [INTERFACE/enviro-clarity-main/src/pages/TriagemComercialPage.tsx](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/pages/TriagemComercialPage.tsx)
- [INTERFACE/enviro-clarity-main/src/hooks/use-process-flow.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/hooks/use-process-flow.ts)
- [INTERFACE/enviro-clarity-main/src/lib/decisionEngine.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/lib/decisionEngine.ts)
- [INTERFACE/enviro-clarity-main/src/lib/diagnostic-engine.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/lib/diagnostic-engine.ts)
- [INTERFACE/enviro-clarity-main/src/lib/diagnostic-rules.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/lib/diagnostic-rules.ts)
- [INTERFACE/enviro-clarity-main/src/lib/flow-execution.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/lib/flow-execution.ts)
- [INTERFACE/enviro-clarity-main/src/lib/budget-engine.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/lib/budget-engine.ts)
- [INTERFACE/enviro-clarity-main/src/lib/proposal-generator.ts](/home/guilherme/Projetos%20VS%20CODE/INTERFACE/enviro-clarity-main/src/lib/proposal-generator.ts)

### Motor metodologico Habilis

- [HABILIS_AI/agentes/agente_01_coletor.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_01_coletor.txt)
- [HABILIS_AI/agentes/agente_02_estruturador.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_02_estruturador.txt)
- [HABILIS_AI/agentes/agente_04_auditor.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_04_auditor.txt)
- [HABILIS_AI/agentes/agente_03_operacional.txt](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/agentes/agente_03_operacional.txt)
- [HABILIS_AI/modelos/base_modelo_conhecimento.json](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/modelos/base_modelo_conhecimento.json)
- [HABILIS_AI/scripts/generate_regularizacao_report.py](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/scripts/generate_regularizacao_report.py)
- [HABILIS_AI/scripts/generate_regiao_report.py](/home/guilherme/Projetos%20VS%20CODE/HABILIS_AI/scripts/generate_regiao_report.py)

### Base atual da Itecológica

- [ITECOLOGICA/analista/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/index.html)
- [ITECOLOGICA/analista/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/app.js)
- [ITECOLOGICA/backend/supabase/diagnosis_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/diagnosis_v1.sql)
- [ITECOLOGICA/backend/supabase/functions/open-diagnosis-case/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/open-diagnosis-case/index.ts)
- [ITECOLOGICA/backend/supabase/functions/prepare-diagnosis-run/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/prepare-diagnosis-run/index.ts)
- [ITECOLOGICA/backend/supabase/functions/ingest-diagnosis-step-output/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/ingest-diagnosis-step-output/index.ts)

---

## Decisao de transplantacao

### Copiar integralmente ou quase integralmente

Esses blocos tem alto valor e baixo risco de reaproveitamento:

- `use-process-flow.ts`
- `decisionEngine.ts`
- `diagnostic-engine.ts`
- `diagnostic-rules.ts`
- prompts dos agentes do `HABILIS_AI`
- modelo `base_modelo_conhecimento.json`
- scripts de relatorio do `HABILIS_AI`

### Copiar parcialmente

Esses blocos valem muito, mas precisam ser desacoplados:

- `DiagnosticoPage.tsx`
- `TriagemComercialPage.tsx`
- `flow-execution.ts`
- `budget-engine.ts`
- `proposal-generator.ts`

### Nao copiar como base final

Esses blocos servem apenas como referencia:

- `unifiedService.ts`
- `leadsService.ts` se estiver acoplado a mock/localStorage
- seeds e `mock-data`
- roteamento completo do `App.tsx`
- contexts inteiros sem filtro

---

## Matriz de reaproveitamento

| Bloco | Origem | Reaproveitamento | Destino novo | Adaptacao obrigatoria |
| --- | --- | --- | --- | --- |
| Motor de fluxo | `src/hooks/use-process-flow.ts` | alto | `analista_v2/core/process-flow.ts` | trocar `localStorage` e servicos antigos por Supabase |
| Diagnostico canonico | `src/pages/DiagnosticoPage.tsx` | alto | `analista_v2/modules/diagnostico/` | separar UI, hooks e calculos; remover dependencias de contexto legado |
| Triagem e handoff | `src/pages/TriagemComercialPage.tsx` | medio | `crm/` e `analista_v2/modules/handoff/` | manter apenas o que serve ao handoff do CRM |
| Motor de decisao | `src/lib/decisionEngine.ts` | alto | `backend/domain/decision-engine.ts` ou `analista_v2/core/decision-engine.ts` | plugar com `crm_diagnosis_*` e payloads reais |
| Regras de diagnostico | `src/lib/diagnostic-engine.ts`, `src/lib/diagnostic-rules.ts` | alto | `backend/domain/diagnostic/` | revisar interfaces e nomes de dominio |
| Execucao derivada | `src/lib/flow-execution.ts` | medio/alto | `backend/domain/execution/` | transformar saidas em `run_steps`, prazos e artefatos |
| Orcamento | `src/lib/budget-engine.ts` | medio/alto | `backend/domain/budget/` | alinhar precificacao com servicos da Itecológica |
| Proposta | `src/lib/proposal-generator.ts` | medio/alto | `backend/domain/proposal/` | adaptar templates, branding e saida final |
| Prompts Habilis | `HABILIS_AI/agentes/*.txt` | alto | `backend/assets/habilis/agents/` | versionar e referenciar no manifesto de execucao |
| Modelo de conhecimento | `HABILIS_AI/modelos/base_modelo_conhecimento.json` | alto | `backend/assets/habilis/models/` | validar schema esperado pela execucao nova |
| Relatorios HTML | `HABILIS_AI/scripts/*.py` | medio | `backend/reporting/` | portar ou encapsular geracao para pipeline atual |

---

## Estrutura alvo recomendada

Para nao misturar V1 estatica com o novo nucleo, o modulo transplantado deve nascer separado:

```text
ITECOLOGICA/
  analista/                       -> V1 atual, manter como referencia funcional
  analista_v2/                    -> novo modulo operacional
  backend/
    domain/
      diagnostic/
      execution/
      budget/
      proposal/
    assets/
      habilis/
        agents/
        models/
    reporting/
  docs/
    PLANO_TRANSPLANTACAO_AREA_ANALISTA_V1.md
```

### Regra pratica

- `analista/` permanece como cockpit simples e historico
- `analista_v2/` recebe o que vem do prototipo maduro
- `backend/domain/` recebe a logica que nao deve viver acoplada a tela

---

## Sequencia de execucao

### Fase 1. Consolidar o nucleo

Copiar primeiro:

1. `use-process-flow.ts`
2. `decisionEngine.ts`
3. `diagnostic-engine.ts`
4. `diagnostic-rules.ts`
5. prompts e modelo do `HABILIS_AI`

Objetivo:

- garantir processo
- garantir motor de decisao
- garantir metodologia

### Fase 2. Subir a operacao de diagnostico

Copiar e adaptar:

1. `DiagnosticoPage.tsx`
2. partes uteis de `flow-execution.ts`
3. geracao de obrigacoes, documentos, servicos e risco

Objetivo:

- tornar a Area do Analista mais profunda
- sair do painel manual basico

### Fase 3. Fechar comercializacao e entrega

Copiar e adaptar:

1. `budget-engine.ts`
2. `proposal-generator.ts`
3. scripts de relatorio do `HABILIS_AI`

Objetivo:

- ligar diagnostico a proposta
- produzir entrega tecnica reaproveitavel

---

## O que precisa ser reescrito no novo

Mesmo com alto reaproveitamento, estes pontos devem nascer novos:

- contratos de dados ligados a `crm_diagnosis_cases`, `crm_diagnosis_inputs`, `crm_diagnosis_runs` e `crm_diagnosis_artifacts`
- autenticacao e autorizacao da Area do Analista
- integracao real com Supabase
- upload e indexacao de documentos
- aprovacao humana
- identidade visual final da Area do Analista

---

## Risco principal

O maior risco nao esta no diagnostico.

O maior risco esta em copiar o prototipo inteiro, junto com:

- `localStorage`
- mocks
- navegacao legada
- contextos inchados

Se isso entrar sem filtro, o novo produto nasce carregando divida tecnica desnecessaria.

---

## Recomendacao final

A estrategia correta e:

1. manter `enviro-clarity-main` intacto como original
2. manter `ITECOLOGICA/analista/` como V1 funcional
3. abrir `ITECOLOGICA/analista_v2/` como nucleo novo
4. transplantar primeiro o motor e depois a interface
5. ligar tudo ao backend novo da Itecológica, e nao ao armazenamento do prototipo

Em resumo:

- copiar o cerebro
- copiar a metodologia
- copiar a parte madura do diagnostico
- nao copiar a casca inteira do legado

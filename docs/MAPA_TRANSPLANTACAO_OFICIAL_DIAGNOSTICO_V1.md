# Mapa de Transplantacao Oficial do Diagnostico V1

## Objetivo

Definir, de forma fechada, quais blocos maduros de diagnostico devem ser internalizados dentro da `ITECOLOGICA`, em qual ordem e para qual camada do sistema oficial.

Este documento existe para evitar:

- copia oportunista de arquivo solto
- reintroducao de prototipos como sistema paralelo
- duplicacao de logica entre frontend e backend
- evolucao sem ownership claro

## Regra central

Somente a `ITECOLOGICA` e sistema oficial.

Tudo que estiver fora dela:

- `INTERFACE/`
- `HABILIS_AI/`
- demais pastas auxiliares

deve ser tratado apenas como:

- fonte de reaproveitamento
- referencia metodologica
- laboratorio historico

## Objetivo arquitetural da fase

Internalizar o diagnostico mais maduro dentro da `ITECOLOGICA`, distribuindo cada bloco na camada correta:

- `app/`, `crm/`, `analista/` para interface oficial
- `backend/supabase/functions/` para mutacoes e orquestracao
- `backend/domain/diagnostic/` para regra pura de negocio
- `backend/assets/habilis/` para prompts, modelos e artefatos metodologicos
- `backend/reporting/` para geracao de relatorios

## Fontes auditadas

### Plataforma madura de diagnostico

Origem:

- `INTERFACE/enviro-clarity-main`

Blocos de maior valor encontrados:

- `src/pages/DiagnosticoPage.tsx`
- `src/hooks/use-process-flow.ts`
- `src/lib/diagnostic-engine.ts`
- `src/lib/decisionEngine.ts`
- `src/lib/flow-execution.ts`
- `src/lib/proposal-generator.ts`

### Motor metodologico e relatorios

Origem:

- `HABILIS_AI`

Blocos de maior valor encontrados:

- `agentes/agente_01_coletor.txt`
- `agentes/agente_02_estruturador.txt`
- `agentes/agente_04_auditor.txt`
- `agentes/agente_03_operacional.txt`
- `modelos/base_modelo_conhecimento.json`
- `scripts/generate_regularizacao_report.py`
- `scripts/generate_regiao_report.py`
- `relatorio_regularizacao_ambiental.html`

## Decisao oficial: o que entra agora

### Prioridade 1 — internalizar o motor oficial

Estes blocos entram primeiro porque concentram a maior parte da inteligencia real do diagnostico:

1. `INTERFACE/enviro-clarity-main/src/lib/decisionEngine.ts`
2. `INTERFACE/enviro-clarity-main/src/lib/diagnostic-engine.ts`
3. `INTERFACE/enviro-clarity-main/src/lib/flow-execution.ts`
4. `HABILIS_AI/modelos/base_modelo_conhecimento.json`
5. `HABILIS_AI/agentes/*.txt`

Destino oficial:

- regra de negocio pura:
  `ITECOLOGICA/backend/domain/diagnostic/`
- assets metodologicos:
  `ITECOLOGICA/backend/assets/habilis/`

Motivo:

- concentram diagnostico, obrigacoes, servicos, risco, plano de execucao e estrategia
- reduzem dependencia de logica espalhada no frontend
- permitem construir uma Area do Analista forte sem continuar refem do prototipo

### Prioridade 2 — internalizar a saida tecnica

Estes blocos entram em seguida:

1. `HABILIS_AI/scripts/generate_regularizacao_report.py`
2. `HABILIS_AI/scripts/generate_regiao_report.py`
3. `HABILIS_AI/relatorio_regularizacao_ambiental.html`

Destino oficial:

- `ITECOLOGICA/backend/reporting/`

Motivo:

- ja existe formato de relatorio tecnico pronto
- isso encurta o caminho entre `final_output` e entrega real
- evita reescrever rendering do zero

### Prioridade 3 — internalizar proposta e continuidade

Estes blocos entram depois da homologacao do motor:

1. `INTERFACE/enviro-clarity-main/src/lib/proposal-generator.ts`
2. `INTERFACE/enviro-clarity-main/src/lib/budget-engine.ts`
3. `INTERFACE/enviro-clarity-main/src/lib/habilis-services.ts`

Destino oficial sugerido:

- `ITECOLOGICA/backend/domain/commercial/`
ou
- `ITECOLOGICA/backend/domain/proposal/`

Motivo:

- devem derivar do diagnostico oficial, nao do prototipo
- fazem mais sentido depois que risco, obrigacoes e execucao estiverem internalizados

## Decisao oficial: o que entra depois

### UI madura do diagnostico

Entram depois:

1. `INTERFACE/enviro-clarity-main/src/pages/DiagnosticoPage.tsx`
2. `INTERFACE/enviro-clarity-main/src/hooks/use-process-flow.ts`

Destino oficial:

- `ITECOLOGICA/analista/` como referencia de evolucao
- ou futura construcao da `analista_v2/`, somente depois da homologacao do fluxo vivo

Motivo:

- a UI atual da `analista/` ja opera com a base oficial
- trazer a casca visual antes do motor aumentaria o risco de nova camada sobre camada
- primeiro internalizamos o cerebro, depois sofisticamos o cockpit

## Decisao oficial: o que nao deve ser copiado bruto

Nao copiar como base oficial:

- `localStorage`
- mocks
- seeds de prototipo
- contexts globais do prototipo
- a casca inteira do `enviro-clarity-main`
- paginas administrativas ou rotas paralelas nao ligadas ao fluxo vivo

Motivo:

- isso traria legado de interface e persistencia antiga
- criaria duplicidade entre `ITECOLOGICA` e os laboratorios

## Mapa de destino por camada

| Bloco de origem | Entrar agora | Destino oficial |
| --- | --- | --- |
| `decisionEngine.ts` | sim | `backend/domain/diagnostic/` |
| `diagnostic-engine.ts` | sim | `backend/domain/diagnostic/` |
| `flow-execution.ts` | sim | `backend/domain/diagnostic/` |
| `agentes/*.txt` | sim | `backend/assets/habilis/agents/` |
| `base_modelo_conhecimento.json` | sim | `backend/assets/habilis/models/` |
| `generate_*_report.py` | sim | `backend/reporting/` |
| `relatorio_*.html` | sim, como referencia | `backend/reporting/templates/` |
| `proposal-generator.ts` | depois | `backend/domain/proposal/` |
| `budget-engine.ts` | depois | `backend/domain/proposal/` |
| `DiagnosticoPage.tsx` | depois | referencia para evolucao de `analista/` |
| `use-process-flow.ts` | depois | referencia para evolucao de `analista/` |

## 3 passos da execucao tecnica

### Passo 1 — Motor oficial

- transplantar `decisionEngine.ts`
- transplantar `diagnostic-engine.ts`
- transplantar `flow-execution.ts`
- adaptar para os contratos de `crm_diagnosis_*`

### Passo 2 — Assets metodologicos e relatorios

- trazer `agentes/*.txt`
- trazer `base_modelo_conhecimento.json`
- trazer `generate_*_report.py`
- amarrar a geracao de relatorio ao `final_output`

### Passo 3 — Evolucao do cockpit

- usar a UI madura do prototipo como referencia
- refatorar a `analista/` com base no motor oficial
- so abrir `analista_v2/` como trilha ativa depois da homologacao do fluxo vivo

## Criterio de aceite desta decisao

Esta fase de transplantacao estara bem definida quando:

1. houver uma lista fechada do que entra agora
2. cada bloco tiver destino oficial dentro da `ITECOLOGICA`
3. o time parar de puxar logica diretamente de prototipos para a superficie oficial
4. a evolucao do diagnostico passar a nascer no sistema central

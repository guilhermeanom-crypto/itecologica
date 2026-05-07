# ITECOLOGICA Sistema Central V1

Base central da ITECOLOGICA para:

- captacao publica de leads
- CRM comercial interno
- Area do Analista para diagnostico
- backend Supabase com funcoes e estado operacional

## Mapa oficial

O mapa oficial do sistema esta em:

- [docs/MAPA_SISTEMA_CENTRAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_SISTEMA_CENTRAL_V1.md)

## Documentacao viva desta etapa

Se a duvida for operacional, arquitetural ou de publicacao, os documentos centrais sao:

- [docs/MAPA_SISTEMA_CENTRAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_SISTEMA_CENTRAL_V1.md)
- [docs/ORQUESTRACAO_HABILIS_ITECOLOGICA_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/ORQUESTRACAO_HABILIS_ITECOLOGICA_V1.md)
- [docs/PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md)
- [docs/FECHAMENTO_ETAPA_FLUXO_OFICIAL_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/FECHAMENTO_ETAPA_FLUXO_OFICIAL_V1.md)
- [docs/MAPA_TRANSPLANTACAO_OFICIAL_DIAGNOSTICO_V1.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/MAPA_TRANSPLANTACAO_OFICIAL_DIAGNOSTICO_V1.md)

## Documentacao de apoio e historico

Os demais arquivos em `docs/` devem ser lidos como apoio complementar ou trilha futura, nao como fonte principal de operacao.

A documentacao puramente historica vive em [docs/archive/](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/archive/) (escopo inicial e implantacao original do CRM). Esses documentos servem como contexto de origem, nao como guia operacional.

A `docs/ARQUITETURA_DIAGNOSTICO_SITE_V1.md` mistura desenho V1 (implementado) com Fase 2+ (planejada). A propria abertura do documento separa o que ja existe do que ainda nao foi implementado.

Resumo pratico:

- `app/`: home publica oficial
- `crm/`: CRM oficial
- `analista/`: Area do Analista oficial
- `backend/supabase/`: banco, politicas e edge functions oficiais
- `backend/domain/diagnostic/`: nucleo novo de diagnostico

## Publicacao atual

Hoje o projeto da Vercel esta configurado com `Root Directory = app`.

Isso significa que as rotas vivas no dominio estao saindo desta camada:

- `https://www.itecologica.com.br/` -> `app/index.html`
- `https://www.itecologica.com.br/crm/` -> `app/crm/`
- `https://www.itecologica.com.br/analista/` -> `app/analista/`

Para evitar confusao:

- `crm/` continua sendo a origem canonica de edicao do CRM
- `analista/` continua sendo a origem canonica de edicao da Area do Analista
- `app/` e a superficie publicada atual na Vercel

## Fluxo canonico

1. visitante entra na `home`
2. a home envia lead para `create-public-lead`
3. o lead entra em `crm_leads_public`
4. o time comercial trabalha o lead no `CRM`
5. o CRM faz handoff para a `Area do Analista`
6. o Analista abre, estrutura e executa o diagnostico
7. o backend consolida artefatos, revisao e saida

## O que e oficial neste repositorio

### Home publica

- [app/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/app/index.html)
- [app/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/app/app.js)
- [app/config.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/app/config.js)

### CRM comercial

- [crm/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/crm/index.html)
- [crm/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/crm/app.js)
- [crm/config.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/crm/config.js)

### Area do Analista

- [analista/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/index.html)
- [analista/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/app.js)
- [analista/config.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/config.js)

### Backend

- [backend/supabase/schema.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/schema.sql)
- [backend/supabase/crm_panel_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/crm_panel_v1.sql)
- [backend/supabase/diagnosis_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/diagnosis_v1.sql)
- [backend/supabase/functions/create-public-lead/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/create-public-lead/index.ts)
- [backend/supabase/functions/open-diagnosis-case/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/open-diagnosis-case/index.ts)
- [backend/supabase/functions/prepare-diagnosis-run/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/prepare-diagnosis-run/index.ts)
- [backend/supabase/functions/ingest-diagnosis-step-output/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/ingest-diagnosis-step-output/index.ts)
- [backend/supabase/functions/generate-canonical-diagnosis/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/generate-canonical-diagnosis/index.ts)

## O que nao participa do fluxo oficial desta etapa

- `analista_v2/` e trilha futura estacionada, ainda nao substitui a Area do Analista atual e nao participa do fluxo operacional desta etapa

## Regra de edicao daqui para frente

Se o ajuste for comercial, editar:

- `crm/`
- `backend/supabase/` relacionado ao CRM

Se o ajuste for diagnostico operacional, editar:

- `analista/`
- `backend/supabase/` relacionado ao diagnostico
- `backend/domain/diagnostic/`

Se o ajuste for site publico, editar:

- `app/`

## Proximo marco estrutural

O ajuste mais importante agora e:

- publicar e validar no ambiente oficial o fluxo ja consolidado
- encerrar esta etapa pelo checklist de ponta a ponta
- abrir a proxima fase apenas depois do fechamento em `docs/FECHAMENTO_ETAPA_FLUXO_OFICIAL_V1.md`

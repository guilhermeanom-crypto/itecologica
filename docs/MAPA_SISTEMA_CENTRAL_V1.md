# Mapa Sistema Central V1

## Objetivo

Declarar qual modulo e oficial dentro da ITECOLOGICA, qual modulo e espelho legado e qual modulo ainda esta em implantacao.

Esse documento existe para evitar:

- duplicidade de edicao
- URL ambigua
- frontend apontando para backend errado
- equipe trabalhando em trilhas paralelas

## Status documental

Este e um dos documentos centrais da etapa atual.

Se houver conflito entre documentos, a leitura operacional deve priorizar:

1. `MAPA_SISTEMA_CENTRAL_V1.md`
2. `ORQUESTRACAO_HABILIS_ITECOLOGICA_V1.md`
3. `PUBLICACAO_VALIDACAO_SUPABASE_OFICIAL_V1.md`
4. `FECHAMENTO_ETAPA_FLUXO_OFICIAL_V1.md`

---

## Componentes oficiais

## Regra de leitura importante

Neste momento existem duas camadas que precisam ser lidas separadamente:

1. `origem canonica no repositorio`
2. `superficie publicada hoje na Vercel`

A origem canonica e onde o time deve editar.
A superficie publicada e a forma como o dominio esta exposto em producao neste momento.

Como o projeto Vercel atual esta com `Root Directory = app`, a publicacao viva do dominio sai de `app/`.
Na pratica, isso significa:

- `https://www.itecologica.com.br/` -> `app/index.html`
- `https://www.itecologica.com.br/crm/` -> `app/crm/`
- `https://www.itecologica.com.br/analista/` -> `app/analista/`

Mesmo assim, a origem canonica para evolucao do CRM e do Analista continua separada no repositorio, conforme blocos abaixo.

---

### 1. Home publica oficial

Origem oficial:

- [app/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/app/index.html)
- [app/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/app/app.js)
- [app/config.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/app/config.js)

Papel:

- apresentar a marca
- captar leads
- enviar para a edge function oficial de entrada

Edge function oficial esperada:

- `create-public-lead`

---

### 2. CRM oficial

Origem oficial:

- [crm/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/crm/index.html)
- [crm/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/crm/app.js)
- [crm/config.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/crm/config.js)

Papel:

- qualificar lead
- registrar historico comercial
- definir follow-up
- fazer handoff para diagnostico

Banco central:

- `crm_leads_public`
- `crm_lead_interactions`
- `crm_internal_users`

Superficie publicada hoje:

- `app/crm/`

---

### 3. Area do Analista oficial

Origem oficial:

- [analista/index.html](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/index.html)
- [analista/app.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/app.js)
- [analista/config.js](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista/config.js)

Papel:

- receber handoff do CRM
- estruturar briefing
- preparar execucao
- registrar etapas
- gerar diagnostico canonico
- conduzir revisao humana

Banco central:

- `crm_diagnosis_cases`
- `crm_diagnosis_inputs`
- `crm_diagnosis_documents`
- `crm_diagnosis_runs`
- `crm_diagnosis_run_steps`
- `crm_diagnosis_artifacts`

Superficie publicada hoje:

- `app/analista/`

---

### 4. Backend oficial

Origem oficial:

- [backend/supabase/schema.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/schema.sql)
- [backend/supabase/crm_panel_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/crm_panel_v1.sql)
- [backend/supabase/crm_interactions_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/crm_interactions_v1.sql)
- [backend/supabase/diagnosis_v1.sql](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/diagnosis_v1.sql)

Edge functions oficiais:

- `create-public-lead`
- `open-diagnosis-case`
- `prepare-diagnosis-run`
- `ingest-diagnosis-step-output`
- `generate-canonical-diagnosis`

---

## Componentes fora do fluxo oficial atual

### Nucleo em implantacao

- [analista_v2/README.md](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/analista_v2/README.md)
- [backend/domain/diagnostic/mod.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/mod.ts)

Status:

- estacionado como trilha futura
- nao substitui a Area do Analista atual
- nao participa da operacao oficial desta etapa
- nao deve receber prioridade antes da homologacao do fluxo vivo

### Documentacao historica

- [docs/archive/](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/docs/archive/)

Conteudo:

- escopo inicial da Etapa 1 (captacao publica + endpoint seguro)
- implantacao original do CRM em cima de `crm_leads_public`

Status:

- contexto de origem do sistema, util como rastro de decisao
- nao orienta operacao atual
- nao deve ser editado como guia vivo

---

## Fluxo canonico do sistema central

```text
Home oficial
  -> create-public-lead
  -> crm_leads_public
  -> CRM oficial
  -> handoff para diagnostico
  -> Area do Analista oficial
  -> pipeline e artefatos
  -> revisao humana
```

---

## Regra operacional

Se o mesmo modulo existir em mais de um lugar:

1. a origem oficial e a declarada neste documento
2. a copia publicada em `app/` deve ser tratada como superficie de deploy enquanto a Vercel continuar com `Root Directory = app`
3. novas features devem nascer apenas na origem oficial
4. depois da evolucao da origem oficial, a superficie publicada correspondente precisa ser sincronizada antes do deploy

---

## Ajuste estrutural prioritario

O proximo ajuste obrigatorio para o sistema central ficar coerente e:

1. Analista deixar de depender do fluxo manual como caminho principal
2. disparar execucao e aprovacao em cima do caso aberto pelo CRM
3. ligar o diagnostico canonico ao pipeline final auditado

# Publicação e Validação Supabase Oficial V1

## Contexto

Projeto oficial da ITECOLOGICA identificado nos arquivos de configuração:

- `https://cixgnglubgczawnfyspw.supabase.co`

Esta publicação deve acontecer apenas na base oficial da ITECOLOGICA.

## Status documental

Este e um dos documentos centrais da etapa atual. Use este arquivo como referencia principal para deploy e validacao operacional.

---

## Pré-condições

Antes de publicar:

1. ter acesso ao projeto Supabase oficial
2. ter `SUPABASE_SERVICE_ROLE_KEY` válida no ambiente de deploy
3. ter `ALLOWED_ORIGINS` revisado
4. ter `TURNSTILE_SECRET_KEY` revisado
5. ter `TURNSTILE_REQUIRED=true` definido em ambientes públicos (home em produção). Sem essa flag, a função `create-public-lead` aceita requisições mesmo se `TURNSTILE_SECRET_KEY` estiver ausente. Com `TURNSTILE_REQUIRED=true`, falta de secret bloqueia a requisição e loga erro.
6. ter usuário interno válido em `crm_internal_users`

---

## Ordem oficial de aplicação

### 1. Banco

Aplicar, nesta ordem:

1. `backend/supabase/schema.sql`
2. `backend/supabase/crm_panel_v1.sql`
3. `backend/supabase/crm_interactions_v1.sql`
4. `backend/supabase/diagnosis_v1.sql`

Opcional, se necessário para operação:

5. `backend/supabase/crm_internal_user_seed.sql`
6. `backend/supabase/whatsapp_first_contact_v1.sql`

---

## 2. Edge functions oficiais

Publicar estas functions:

1. `create-public-lead`
2. `open-diagnosis-case`
3. `prepare-diagnosis-run`
4. `ingest-diagnosis-step-output`
5. `generate-canonical-diagnosis`
6. `save-diagnosis-briefing`
7. `review-diagnosis-case`
8. `update-crm-lead`
9. `create-crm-lead-interaction`

---

## 3. Sequência de deploy sugerida com Supabase CLI

Se o projeto for vinculado via CLI, a sequência esperada é:

```bash
supabase link --project-ref cixgnglubgczawnfyspw
supabase functions deploy create-public-lead
supabase functions deploy open-diagnosis-case
supabase functions deploy prepare-diagnosis-run
supabase functions deploy ingest-diagnosis-step-output
supabase functions deploy generate-canonical-diagnosis
supabase functions deploy save-diagnosis-briefing
supabase functions deploy review-diagnosis-case
supabase functions deploy update-crm-lead
supabase functions deploy create-crm-lead-interaction
```

Se preferir, publicar uma a uma e validar entre blocos:

### Bloco A

- `create-public-lead`
- `update-crm-lead`
- `create-crm-lead-interaction`

### Bloco B

- `open-diagnosis-case`
- `save-diagnosis-briefing`
- `prepare-diagnosis-run`

### Bloco C

- `ingest-diagnosis-step-output`
- `generate-canonical-diagnosis`
- `review-diagnosis-case`

---

## 4. Configuração dos frontends oficiais

Confirmar:

- `app/config.js` com `create-public-lead`
- `crm/config.js` apontando para `cixgnglubgczawnfyspw.supabase.co`
- `analista/config.js` apontando para `cixgnglubgczawnfyspw.supabase.co`

---

## 5. Validação mínima após publicação

### Home

1. enviar lead real de teste
2. confirmar inserção em `crm_leads_public`

### CRM

1. logar com usuário interno
2. abrir lead
3. salvar atualização do lead
4. registrar interação
5. confirmar atualização do lead e histórico

### Handoff

1. encaminhar lead para diagnóstico
2. confirmar criação ou reaproveitamento do caso
3. abrir Área do Analista via caso

### Analista

1. salvar briefing
2. gerar diagnóstico canônico
3. preparar execução
4. confirmar run e steps

### Pipeline

1. registrar saída de `agent_01`
2. confirmar bloqueio de etapa fora de ordem
3. concluir pipeline até `awaiting_human_review`

### Revisão

1. aprovar caso
2. reabrir caso
3. rejeitar caso

---

## Critério de fechamento desta etapa

A etapa só deve ser marcada como encerrada quando:

1. as 9 edge functions estiverem publicadas
2. o banco estiver atualizado
3. os fluxos de validação tiverem passado no ambiente oficial
4. o time puder operar sem depender de update direto em tabela pelo frontend

---

## Próxima etapa autorizada depois do fechamento

Somente depois desta publicação e validação:

1. deduplicação de leads
2. publicação oficial reprodutível dos frontends
3. integração do fechamento técnico com proposta e continuidade comercial

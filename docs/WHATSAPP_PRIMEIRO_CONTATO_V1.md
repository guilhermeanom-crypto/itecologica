# WhatsApp Primeiro Contato V1

## Objetivo

Disparar o primeiro contato automaticamente logo apos a entrada do lead, reduzindo o tempo de resposta comercial e registrando o resultado no CRM.

## O que esta V1 faz

- tenta enviar uma mensagem inicial no WhatsApp assim que o lead entra
- grava o status operacional no proprio lead
- registra cada tentativa na tabela `crm_lead_contact_attempts`
- mostra no CRM se o primeiro contato ficou `pending`, `sent`, `failed` ou `invalid_phone`

## O que esta V1 ainda nao faz

- responder automaticamente quando o lead retorna
- qualificar a conversa com IA
- registrar webhook de entrega, leitura e resposta

Esses pontos ficam para a proxima etapa.

## Passo 1 - Banco

No Supabase SQL Editor, execute:

- `backend/supabase/schema.sql`
- `backend/supabase/crm_panel_v1.sql`
- `backend/supabase/whatsapp_first_contact_v1.sql`

O ultimo script adiciona colunas em `crm_leads_public` e cria a tabela `crm_lead_contact_attempts`.

## Passo 2 - Variaveis da edge function

Configure estas variaveis em `create-public-lead`:

- `WHATSAPP_FIRST_CONTACT_ENABLED=true`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_TEMPLATE_NAME=...`
- `WHATSAPP_TEMPLATE_LANGUAGE=pt_BR`
- `WHATSAPP_API_VERSION=v23.0`

## Passo 3 - Template do WhatsApp

Use um template aprovado no provedor do WhatsApp com 3 parametros de corpo, nesta ordem:

1. nome do lead
2. empresa do lead
3. necessidade principal

Exemplo de mensagem:

```text
Oi, {{1}}. Recebemos seu contato da empresa {{2}} sobre {{3}}.
Sou o atendimento inicial da Itecologica e vou organizar seu primeiro passo por aqui.
Se preferir, posso continuar por este WhatsApp.
```

## Passo 4 - Comportamento esperado

Quando o lead entra:

1. o lead e gravado em `crm_leads_public`
2. a edge function tenta normalizar o telefone para WhatsApp
3. se a automacao estiver habilitada, o sistema envia o template inicial
4. o CRM passa a mostrar:
   - `Enviado no WhatsApp`
   - `Falhou`
   - `Telefone invalido`
   - `Pendente`

## Leitura operacional no CRM

No painel interno, cada lead passa a mostrar:

- status do primeiro contato automatico
- canal do primeiro contato
- ultima tentativa automatica
- erro da automacao, quando houver

## Proxima etapa recomendada

Depois que o disparo inicial estiver funcionando, a evolucao natural e:

1. criar o webhook do WhatsApp para receber respostas
2. gravar mensagens inbound em `crm_lead_contact_attempts`
3. conectar uma camada de IA para triagem
4. passar para humano quando houver sinal de compra ou excecao

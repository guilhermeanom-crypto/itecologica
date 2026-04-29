# Habilis CRM Captacao MVP

Pacote independente para colocar a captacao de leads no ar antes de plugar o restante do sistema operacional.

## Objetivo

Capturar leads reais da landing page e gravar em um CRM proprio, separado do fluxo hibrido atual.

## O que tem aqui

- `app/`: landing page simples com formulario e envio para endpoint proprio
- `backend/supabase/schema.sql`: estrutura minima do banco
- `backend/supabase/functions/create-public-lead/index.ts`: endpoint publico para receber lead
- `docs/`: escopo da etapa 1 e checklist de go-live
- `docs/IMPLANTACAO_SEGURA.md`: roteiro para publicar sem deixar dados expostos

## Fluxo MVP

1. O visitante preenche o formulario.
2. A landing envia os dados para a edge function `create-public-lead`.
3. A funcao valida os campos e grava em `crm_leads_public`.
4. O time comercial passa a trabalhar em cima dessa base nova.

## Como validar rapido

1. Configure `app/config.js` a partir de `app/config.example.js`.
2. Publique a tabela e a funcao no Supabase.
3. Abra `app/index.html` em um servidor estatico.
4. Envie um lead de teste.
5. Confirme se o registro entrou no banco.

## Seguranca do modelo

- o banco nao aceita insert anonimo direto
- a edge function grava com `service role`
- somente origens permitidas podem chamar pelo navegador
- Turnstile pode ser ativado para uso real

## O que este MVP resolve

- captacao real
- centralizacao inicial dos leads
- base limpa para integrar CRM, automacao e IA depois

## O que ainda nao resolve

- funil comercial completo
- proposta automatica
- atendimento por WhatsApp
- roteamento comercial
- IA respondendo sozinha ao cliente

## Proximo passo recomendado

Depois de validar a entrada do lead, a evolucao mais segura e:

1. listar leads em um painel interno
2. adicionar status do funil
3. registrar contato realizado
4. adicionar qualificacao automatica por IA

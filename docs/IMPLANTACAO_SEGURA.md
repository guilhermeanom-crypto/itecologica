# Implantacao Segura

## Objetivo

Colocar o prototipo no ar sem deixar banco aberto nem endpoint frouxo.

## Regra central

Formulario publico nunca deve gravar direto no banco.

O caminho correto deste prototipo e:

1. landing publica
2. edge function publica
3. service role apenas no servidor
4. tabela com RLS habilitado e sem insert anonimo

## O que foi endurecido neste pacote

- sem politica de insert anonimo na tabela
- insert feito apenas pela edge function
- lista de origens permitidas via `ALLOWED_ORIGINS`
- honeypot contra bot simples
- validacao de tempo minimo de preenchimento
- suporte a Turnstile opcional e recomendado

## Variaveis da edge function

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`
- `TURNSTILE_SECRET_KEY`

### Exemplo de `ALLOWED_ORIGINS`

`https://seudominio.com,https://www.seudominio.com`

## Variavel da landing

Em [app/config.js](/home/guilherme/Projetos%20VS%20CODE/HABILIS_CRM_CAPTACAO_MVP/app/config.js:1):

- `apiBaseUrl`
- `publicLeadEndpoint`
- `turnstileSiteKey`

## Ordem recomendada

1. criar o projeto no Supabase
2. executar [schema.sql](/home/guilherme/Projetos%20VS%20CODE/HABILIS_CRM_CAPTACAO_MVP/backend/supabase/schema.sql:1)
3. publicar a edge function
4. cadastrar as variaveis de ambiente da function
5. configurar a landing com o dominio final
6. ativar Turnstile
7. testar envio real

## Publicacao segura

### Banco

- nao exponha `service_role`
- nao crie politica anonima de select
- nao crie politica anonima de insert

### Frontend

- publique em dominio proprio ou subdominio proprio
- habilite HTTPS
- use apenas a URL da edge function publica

### Bot protection

- use Turnstile em producao
- mantenha honeypot ativo
- mantenha validacao por origem

## O que ainda e importante depois

- rate limit no gateway ou CDN
- notificacao interna quando lead entrar
- painel interno autenticado para leitura
- trilha de auditoria comercial

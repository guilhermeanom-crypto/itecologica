# CRM V1 - Implantacao

## Objetivo

Abrir um painel interno real no mesmo ecossistema da landing page, lendo e atualizando os leads de `crm_leads_public`.

## O que foi criado

- `crm/`: painel interno estatico
- `backend/supabase/crm_panel_v1.sql`: script de banco e acesso interno

## Passo 1 - Banco

No Supabase SQL Editor, execute o arquivo:

- `backend/supabase/crm_panel_v1.sql`

Esse script:

- adiciona `internal_notes` em `crm_leads_public`
- cria a tabela `crm_internal_users`
- cria as policies de leitura e atualizacao para usuarios autenticados do CRM
- aplica os `grant`s necessarios para o papel `authenticated`

## Passo 2 - Criar usuarios internos

No Supabase:

1. abra `Authentication`
2. crie os usuarios internos manualmente
3. confirme os e-mails, se necessario

Se o usuario ja aparece em `Authentication > Users`, nao crie de novo.
Nesse caso, basta cadastrar o mesmo e-mail na tabela `crm_internal_users`.

Depois, no SQL Editor, insira cada pessoa autorizada:

```sql
insert into public.crm_internal_users (email, full_name, role)
values
  ('comercial@seudominio.com', 'Equipe Comercial', 'comercial'),
  ('diretoria@seudominio.com', 'Diretoria', 'admin')
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  active = true;
```

### Caso atual: apenas um usuario

Se for so voce por enquanto, use diretamente:

```sql
insert into public.crm_internal_users (email, full_name, role)
values
  ('guilherme.anom@gmail.com', 'Guilherme', 'admin')
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  active = true;
```

Esse mesmo bloco foi salvo em:

- `backend/supabase/crm_internal_user_seed.sql`

## Passo 3 - Configurar o painel

Copie:

- `crm/config.example.js`

para:

- `crm/config.js`

e preencha:

```js
window.ITECOLOGICA_CRM_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA_CHAVE_ANON_PUBLICA",
};
```

## Passo 4 - Publicar

Publique a pasta `crm/` como parte do mesmo site ou em um subcaminho interno.

Exemplo esperado:

- `https://seudominio.com/crm/`

## Passo 5 - Validar

1. abra `/crm/`
2. faca login com um usuario interno criado no Supabase Auth
3. confirme se os leads da landing aparecem
4. atualize:
   - status
   - qualificacao
   - responsavel
   - primeiro contato
   - observacoes internas

## Solucao de problemas

Se o login funcionar, mas o CRM nao abrir os leads:

- confirme se o usuario existe em `Authentication > Users`
- confirme se o mesmo e-mail existe em `public.crm_internal_users`
- reexecute `backend/supabase/crm_panel_v1.sql`

O script completo precisa criar:

- tabela `crm_internal_users`
- policy de leitura da propria linha para cada usuario autenticado
- policy de leitura e atualizacao em `crm_leads_public`
- `grant select` em `crm_internal_users` para `authenticated`
- `grant select, update` em `crm_leads_public` para `authenticated`
- `grant execute` na funcao `is_crm_internal_user()` para `authenticated`

## Escopo da V1

- login
- inbox de leads
- detalhe do lead
- atualizacao basica do atendimento

## Proximo passo depois da V1

- protecao de rota mais forte
- filtro por responsavel
- trilha de interacoes
- notificacao por WhatsApp ou e-mail

# Checklist Go Live

## Minimo para colocar no ar

- dominio ou subdominio definido
- landing publicada
- projeto Supabase ativo
- tabela `crm_leads_public` criada
- edge function `create-public-lead` publicada
- `ALLOWED_ORIGINS` configurado
- Turnstile configurado
- `config.js` apontando para a URL correta
- lead de teste enviado com sucesso
- lead de teste validado no banco

## Campos minimos do lead

- nome
- empresa
- WhatsApp
- cidade
- estado
- necessidade
- urgencia
- consentimento

## Campos importantes mas opcionais

- email
- CNPJ
- CNAE
- origem da campanha
- pagina de origem
- observacoes

## Testes antes de abrir trafego

- enviar lead com todos os campos
- enviar lead sem email
- bloquear envio sem consentimento
- verificar tratamento de erro de rede
- verificar bloqueio por origem errada
- verificar falha de captcha
- verificar duplicate handling no processo comercial
- confirmar horario de criacao no banco

## Quando considerar aprovado

- o lead entra no banco em menos de 5 segundos
- o time consegue localizar o lead sem depender do sistema antigo
- a pagina funciona no celular
- a mensagem de sucesso aparece corretamente

## Fase 2

- painel interno de leads
- status do funil
- tarefas comerciais
- notificacao por email ou WhatsApp
- IA para qualificacao inicial

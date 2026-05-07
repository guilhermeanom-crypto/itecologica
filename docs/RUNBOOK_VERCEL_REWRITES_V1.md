# Runbook - Ativacao do vercel.json com rewrites (Etapa 3)

## Status documental

Documento operacional de transicao. Define a sequencia segura para sair da publicacao "Root Directory = app" para "Root Directory = raiz do repositorio + vercel.json com rewrites".

## O que muda no final

| | Antes | Depois |
|---|---|---|
| Root Directory na Vercel | `app` | raiz do repositorio (vazio) |
| Origem da home publicada | `app/index.html` | `app/index.html` (mesmo) via rewrite `/` -> `/app/` |
| Origem do CRM publicado | `app/crm/` (copia) | `crm/` direto |
| Origem do Analista publicado | `app/analista/` (copia) | `analista/` direto |
| `app/crm/` no repo | existe (copia) | removido |
| `app/analista/` no repo | existe (copia) | removido |
| URLs publicas | `/`, `/crm/`, `/analista/` | identicas |

## Ordem obrigatoria de execucao

NAO inverta a ordem. Cada passo so acontece depois do anterior validar.

### Passo 1 - Commit do vercel.json (ja realizado em main)

O arquivo `vercel.json` na raiz do repositorio define os rewrites. Ele **NAO TEM EFEITO** enquanto o `Root Directory` da Vercel for `app`, porque a Vercel nao busca `vercel.json` na raiz do repositorio quando o root e uma subpasta.

Por isso o commit deste arquivo isolado e seguro: nao muda producao.

### Passo 2 - Criar Preview Deploy a partir de uma branch nova

Antes de tocar em producao, validar em preview:

```bash
git checkout -b vercel-rewrites-validation
git push -u origin vercel-rewrites-validation
```

Na Vercel:

1. Abrir o projeto da Itecologica
2. Settings -> Git -> garantir que branches alem de main produzem preview
3. Se necessario, abrir uma "Preview Build" manual a partir da branch `vercel-rewrites-validation`

Ainda nao mudar `Root Directory`. Anotar a URL do preview gerado (vai usar a configuracao atual).

### Passo 3 - Mudar Root Directory para teste em preview

Importante: a mudanca de `Root Directory` afeta TODAS as builds futuras, inclusive as de produc. Por isso a sequencia abaixo precisa ser feita rapido.

1. Settings -> General -> Root Directory: alterar de `app` para vazio (ou `.`)
2. SALVAR
3. Disparar novo Preview Deploy a partir de `vercel-rewrites-validation`
4. Aguardar build terminar
5. Abrir a URL de preview gerada e validar:
   - `/` carrega a home (visual e formulario funcionam)
   - `/crm/` carrega o login do CRM
   - `/analista/` carrega o login do Analista
   - assets como `/styles.css` (home) carregam
   - assets como `/crm/styles.css` carregam
   - submit do form publico chega no Supabase (testar com lead de teste)
   - login do CRM funciona (sessao Supabase)

### Passo 4 - Decisao GO/NO-GO

Se TUDO funcionou em preview:

- prosseguir para Passo 5 (deploy em producao)

Se ALGO quebrou:

- voltar `Root Directory` para `app` no painel da Vercel
- redisparar deploy de producao a partir de main (volta ao estado anterior)
- abrir issue documentando o que falhou

### Passo 5 - Promover em producao

1. Confirmar que `Root Directory = vazio` esta salvo na Vercel
2. Disparar deploy de producao a partir de main (que ja contem o vercel.json)
3. Validar em producao:
   - `https://www.itecologica.com.br/` -> home
   - `https://www.itecologica.com.br/crm/` -> CRM
   - `https://www.itecologica.com.br/analista/` -> Analista
   - submit de lead real (ou teste controlado)
4. Aguardar pelo menos 30 minutos antes do Passo 6, para detectar regressoes

### Passo 6 - Limpar duplicacao no repo (commit separado)

Apenas APOS Passo 5 ter rodado em producao por 30+ minutos sem regressao:

```bash
git checkout main
git pull
git rm -r app/crm app/analista
git commit -m "Remove duplicacao app/crm e app/analista apos ativacao do vercel.json"
git push
```

A partir deste commit:

- `crm/` e `analista/` sao as UNICAS fontes
- editar `crm/` ou `analista/` reflete direto em producao no proximo deploy
- nao existe mais a regra de "copiar para app/"

### Passo 7 - Atualizar documentacao

Editar:

- `paginas-ativas.html` (a coluna "Publicado hoje" muda para nao mais ter `app/crm/` e `app/analista/`)
- `README.md` (secao "Publicacao atual")
- `docs/MAPA_SISTEMA_CENTRAL_V1.md` (secao "Regra de leitura importante" e o item "Superficie publicada hoje")
- `CHECKLIST_GO_LIVE.md` (a referencia a `app/crm/` removida)

Commit final:

```bash
git commit -am "Atualiza docs apos consolidacao em fontes canonicas unicas"
```

## Rollback de emergencia

Se em qualquer momento entre Passo 5 e Passo 7 a producao apresentar regressao:

1. Painel Vercel -> Deployments -> abrir ultimo deploy bom -> "Promote to Production"
2. NAO precisa mexer em codigo. O arquivo `vercel.json` continua no repo, mas o `Root Directory = app` antigo (se ja foi mudado, voltar para `app`) faz a Vercel ignorar.
3. Se o problema persistir, restaurar `Root Directory = app` na Vercel.

## Razoes pelas quais esta ordem importa

- `vercel.json` na raiz so vale quando `Root Directory = vazio` na Vercel. Ate la, o arquivo vive no repo sem efeito, o que e seguro.
- Trocar `Root Directory` afeta TODAS as builds. Por isso a janela entre Passo 3 e Passo 5 precisa ser curta e bem validada em preview.
- Remover `app/crm/` e `app/analista/` antes do Passo 5 quebraria producao caso o `Root Directory = app` ainda estivesse ativo.
- Por isso o Passo 6 acontece apenas apos o Passo 5 confirmado, em commit separado, para facilitar reverter sem perder o vercel.json.

## Validacao do regex de rewrite

O `vercel.json` usa:

```json
{ "source": "/((?!crm/|crm$|analista/|analista$).*)", "destination": "/app/$1" }
```

Comportamento esperado:

| URL | Reescrita? | Resultado |
|---|---|---|
| `/` | sim -> `/app/` | serve `/app/index.html` |
| `/styles.css` | sim -> `/app/styles.css` | serve home asset |
| `/app.js` | sim -> `/app/app.js` | serve home asset |
| `/crm` | nao | Vercel serve `/crm/index.html` |
| `/crm/` | nao | Vercel serve `/crm/index.html` |
| `/crm/styles.css` | nao | Vercel serve `/crm/styles.css` |
| `/analista/?case_id=X` | nao | Vercel serve `/analista/index.html`, query preservada |
| `/qualquer-coisa-inexistente` | sim -> `/app/qualquer-coisa-inexistente` | 404 (esperado) |

Vercel resolve arquivos antes de aplicar rewrites quando o caminho ja existe no FS, entao caminhos como `/crm/foo.png` funcionam direto.

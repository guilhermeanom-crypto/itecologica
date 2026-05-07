# Plano de unificacao do motor de diagnostico V1

## Status documental

Documento operacional. Define a estrategia para fechar a Etapa 4 do plano de consolidacao (unificar `_shared/official-diagnostic.ts` e `backend/domain/diagnostic/`).

## Por que existe duplicacao hoje

Existem duas implementacoes vivas do motor canonico:

1. [backend/supabase/functions/_shared/official-diagnostic.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/_shared/official-diagnostic.ts) - 796 linhas, fonte canonica em PRODUCAO. Importada pela edge function `generate-canonical-diagnosis`.
2. [backend/domain/diagnostic/](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/) - alvo da unificacao. Codigo dormente atualmente: nenhuma edge function importa daqui hoje.

Origem: o motor foi extraido para um domain layer modular (separacao em `canonical-diagnostic.ts`, `official-diagnostic-engine.ts`, `official-execution-plan.ts`) sem que a edge function fosse migrada. A copia em `_shared/` continuou em producao.

## Divergencias funcionais ja confirmadas

A leitura comparada de `buildStandaloneDiagnosisSeed` revela diferencas que MUDAM o JSON canonico gerado:

| Item | _shared (producao) | domain (alvo) |
|---|---|---|
| Acentuacao | "Agua", "Gestao", "Resíduos", "Emissoes" | "Água", "Gestão", "Resíduos", "Emissões" |
| Pontuacao | "Licenciamento Ambiental - Processo LO" (hifen) | "Licenciamento Ambiental — Processo LO" (travessao) |
| Strings de orgao/legislacao | "Orgao Estadual", "Legislacao aplicavel", "Orgao competente" | "Órgão Estadual", "Legislação aplicável", "Órgão competente" |
| "Trifasico" | "Licenciamento Trifasico" | "Licenciamento Trifásico" |
| Prioridade alta/media | "Media" | "Média" |

Outras divergencias provaveis (precisam ser confirmadas com snapshot test): valores e ordens em `buildOfficialDiagnosticResult` e `buildOfficialExecutionPlan`.

## Por que NAO unificar agora sem teste

A edge function `generate-canonical-diagnosis` materializa este JSON em `crm_diagnosis_artifacts` e ele e exibido na Area do Analista. Trocar a fonte sem snapshot test pode:

- mudar strings ja gravadas em casos historicos
- quebrar comparacoes ou filtros baseados em string exata
- alterar relatorios derivados que esperam o formato V1

A regra senior aqui e: medir antes de cortar.

## Estrategia recomendada (etapa unica, com teste)

### 1. Decidir qual versao e a verdade

Recomendado: **`domain/`** vence (versao com acentuacao correta em portugues). A versao atual em producao foi gerada sem acentos por questao de transito ASCII e nao reflete bem a marca da Itecologica nem o vocabulario regulatorio.

Isso significa que casos historicos terao JSON com strings antigas (sem acento) e novos terao strings novas (com acento). Por isso, a virada precisa ser deliberada e comunicada.

### 2. Construir snapshot fixture de regressao

Criar `backend/supabase/functions/_shared/__snapshots__/canonical-payload.fixture.json` a partir de pelo menos 3 cenarios:

- caso minimo (sem nenhum "sim" nas respostas)
- caso medio (3-4 "sim", licenca presente)
- caso critico (passivo + perigosos + emissoes + sem licenca + pendencia documental)

Para cada cenario, gravar o output atual de:

- `buildStandaloneDiagnosisSeed`
- `buildCanonicalDiagnosisPayload`
- `buildOfficialDiagnosticResult`
- `buildOfficialExecutionPlan`

### 3. Aplicar a unificacao

Trocar `_shared/official-diagnostic.ts` por um shim de re-export:

```ts
export {
  computeRiskScore,
  derivePotentialPoluidor,
  buildStandaloneDiagnosisSeed,
  buildCanonicalDiagnosisPayload,
} from "../../../domain/diagnostic/canonical-diagnostic.ts";
export { buildOfficialDiagnosticResult } from "../../../domain/diagnostic/official-diagnostic-engine.ts";
export { buildOfficialExecutionPlan } from "../../../domain/diagnostic/official-execution-plan.ts";
export type {
  CanonicalDiagnosisSource,
  PollutionPotential,
  DiagnosticAnswers,
  OfficialDiagnosticResult,
  OfficialExecutionPlan,
} from "../../../domain/diagnostic/types.ts";
```

Validar com Supabase CLI que o bundle ainda resolve as importacoes relativas para fora de `functions/`.

### 4. Rerodar os fixtures

Diff entre output novo e snapshot. As unicas diferencas esperadas sao acentuacao/pontuacao listadas acima. Qualquer outra diferenca exige investigacao antes do deploy.

### 5. Comunicar a virada

- changelog explicito do que mudou no JSON canonico
- aviso na Area do Analista que casos novos passam a usar a versao acentuada
- nao reprocessar casos historicos (evita regressao de dados)

## Quando executar

Esta Etapa 4 entra apos:

1. Etapa 3 (vercel.json rewrites) estar estavel em producao
2. Existir banda para executar com calma e validar caso real

## Risco se nao for executado

- mudancas paralelas em `_shared/` e `domain/` se acumulam
- a cada edicao vira mais dificil unificar
- alguem pode acidentalmente importar de `domain/` num novo modulo achando que e canonico, e o output sera diferente do que ja esta em producao

## Salvaguardas atuais (ate executar)

- ambos os arquivos receberam cabecalho explicito declarando seu papel
- `_shared/official-diagnostic.ts` esta marcado como FONTE CANONICA EM PRODUCAO
- `domain/diagnostic/canonical-diagnostic.ts` esta marcado como ALVO DA UNIFICACAO
- este documento e a memoria operacional da estrategia

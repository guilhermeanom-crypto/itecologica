# Area do Analista V2

## Status atual

Esta V2 esta estacionada como trilha futura.

Ela:

- nao participa do fluxo oficial atual
- nao deve ser publicada nesta etapa
- nao substitui `analista/`
- nao deve receber novas features antes da homologacao da trilha oficial viva

Se a demanda for operacional hoje, trabalhar em:

- `ITECOLOGICA/analista/`
- `ITECOLOGICA/backend/supabase/functions/`
- `ITECOLOGICA/backend/domain/diagnostic/`

Este diretorio foi aberto para receber a transplantacao dos blocos maduros do prototipo, sem contaminar a V1 estatica atual.

## Papel desta V2

- substituir gradualmente o cockpit simples em `analista/`
- consumir o backend novo da Itecológica
- usar o fluxo e o motor de diagnostico como nucleo
- preservar o prototipo original como referencia, sem mover nada dele

## Nucleo ja aberto nesta rodada

- tipos de dominio:
  [backend/domain/diagnostic/types.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/types.ts)
- fluxo operacional do diagnostico:
  [backend/domain/diagnostic/process-flow.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/process-flow.ts)
- motor inicial de decisao:
  [backend/domain/diagnostic/decision-engine.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/decision-engine.ts)
- calculo canonico do diagnostico:
  [backend/domain/diagnostic/canonical-diagnostic.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/domain/diagnostic/canonical-diagnostic.ts)
- edge function para materializar esse payload no backend:
  [backend/supabase/functions/generate-canonical-diagnosis/index.ts](/home/guilherme/Projetos%20VS%20CODE/ITECOLOGICA/backend/supabase/functions/generate-canonical-diagnosis/index.ts)

## Proxima rodada recomendada

So depois de homologar a trilha oficial atual:

1. ligar a interface V2 a `generate-canonical-diagnosis`
2. criar a interface V2 consumindo esses contratos novos
3. substituir a logica manual da V1 por esse nucleo compartilhado

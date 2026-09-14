# Status do WorkItem (fila de trabalho)

Mapeamento entre o sistema legado (`crawler-backend`, model `Job`) e o novo sistema (`WorkItem`).

## Tabela de status

| # | Status novo | Label na UI | Campo/momento legado equivalente | Quem pode setar | De onde vem | Para onde vai | Gera log | Seta data | Afeta pagamento | Visível p/ Ateliê | Visível p/ Admin/Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `em_atelie` | Em Ateliê | Job criado, `recebidoConferido=false` | Admin/Owner (emissão do lote) | — (inicial) | `em_producao` | sim (create) | `statusDates.criadoEm` | não | sim | sim |
| 2 | `em_producao` | Em Costura | `recebidoConferido=true` | Ateliê (confirma recebimento) OU Admin/Owner | `em_atelie` | `pronto` | sim | `statusDates.emProducaoEm` | não | sim | sim |
| 3 | `pronto` | Acabamento Pronto | `lotePronto=true` | Ateliê OU Admin/Owner | `em_producao` | `coletado` | sim | `statusDates.prontoEm` | não | sim | sim |
| 4 | `coletado` | Coletado na Van | `recebido=true` | **Admin/Owner apenas** | `pronto` | `descarregado` | sim | `statusDates.coletadoEm` | não | sim | sim |
| 5 | `descarregado` | Descarregado (Barracão) | `dischargedByQrCode=true` | Admin/Owner apenas | `coletado` | `auditoria_aprovada` ou `auditoria_divergente` | sim | `statusDates.descarregadoEm` | não | sim | sim |
| 6 | `auditoria_aprovada` | Auditado | `aprovado=true`, `emAnalise=false` | Admin/Owner apenas | `descarregado` ou `auditoria_divergente` | terminal | sim | `statusDates.auditoriaEm` | libera `paymentStatus=liberado` | sim | sim |
| 7 | `auditoria_divergente` | Em Análise | `aprovado=false, emAnalise=true` (regra cruzada legada) | Automático ao descarregar sem conformidade, ou Admin manualmente | `descarregado` | `em_producao` (reprocessar) ou `auditoria_aprovada` | sim | — | não | sim | sim |

## Reversão manual

Retroceder uma etapa é ação exclusiva de **owner**, via `POST /work-queue/:id/revert` com `motivo` obrigatório. Sempre gera dois registros de auditoria (mudança de status + motivo da reversão).

## Pagamento (campo ortogonal `paymentStatus`)

`pendente` (default) → `liberado` (automático quando `status` vira `auditoria_aprovada`) → `pago` (manual, **owner apenas**, via `POST /work-queue/:id/pay`, seta `dataPgto`).

Campos financeiros (`metrics.orcamento`, `bonus`, `advancedMoneyPayment`, `dataPgto`, `paymentStatus`) são removidos da resposta da API para qualquer principal que não seja owner, em toda rota (`financialAccess.js`).

## Bugs do legado corrigidos (não replicados)

- Datas reescritas mesmo ao desmarcar campo → agora só setadas na transição de entrada.
- `qtdRolo`/`qtdRolos` não recalculado em todos os paths → cálculo único em `calculations.js`.
- Log incorreto hardcoded em `updateJobHasSplit` → cada mutação audita o campo/valor real.
- Dois caminhos de log paralelos → um único `auditService.record()`.
- Falta de checagem de ownership (ateliê podia ver/mexer em job de outro) → toda mutação valida `atelierId`.
- Vazamento financeiro em rotas antigas → oculto centralmente, não por rota.

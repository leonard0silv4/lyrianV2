# Permissões

Sistema centralizado: `Role.permissions: [String]` (enum fechado, `backend/src/modules/permissions/constants.js`), verificado por um único middleware `requirePermission(permission)`. Nenhuma checagem `role === "admin"` espalhada pelo código.

## Papéis (seed inicial)

| Role | Permissões |
|---|---|
| `owner` | Todas (`users:manage`, `roles:manage`, `ateliers:read/write`, `work-queue:read/write/advance`, `audit:read`, `payments:manage`) |
| `admin` | Todas exceto `users:manage`, `roles:manage`, `payments:manage` |
| Ateliê (não é Role, é `AtelierUser`) | Fixo: `ateliers:read` (só o próprio), `work-queue:read` (só o próprio), `work-queue:advance` (só transições `em_atelie→em_producao` e `em_producao→pronto`) |

Novos papéis podem ser criados via `POST /roles` sem alterar código de verificação.

## Acesso financeiro

**Somente `owner` vê e manipula dados financeiros de negócio** (orçamento de outros ateliês, bônus, adiantamento, extrato geral, endpoints de `/payments`). Regra refinada por tipo de principal, aplicada em `work-queue/financialAccess.js`:

- **Owner**: vê tudo.
- **Ateliê**: vê o valor da própria mão de obra (`metrics.orcamento`) e o próprio `paymentStatus`/`dataPgto` (fiel ao portal 09, que mostra ao costureiro quanto ele vai receber) — mas **não** vê `bonus` nem `advancedMoneyPayment` (ajustes que só o owner controla), nem dados de outros ateliês.
- **Staff não-owner** (`admin`): não vê nenhum campo financeiro, nem do próprio ateliê que estiver olhando.

Ações de escrita financeira (`pay`, `apply-bonus`, `POST /payments`, `PATCH /ateliers/:id/adiantamento`) exigem a permissão dedicada `payments:manage`, que só `owner` tem. Frontend (`LoteCard`, `MesaProducaoPage`, `DashboardPage`, `PortalAtelierPage`) só renderiza valores/ações financeiras conforme `usePermission().isOwner`/`isAtelier` — conveniência de UX; a proteção real é o backend nunca enviar o dado.

## Pagamento em lote (Pix)

`POST /payments` quita um ou mais `WorkItem`s de uma vez: soma `orçamento + bônus` dos lotes selecionados, aplica um desconto (limitado ao bruto e ao `Atelier.saldoAdiantamento`), marca os itens como `pago`, debita o desconto do saldo do ateliê, gera o payload Pix "copia e cola" (`shared/pix.js`, EMV/CRC16, sem gateway/rede) e grava um `PaymentBatch` (linha do extrato, com snapshot dos itens pagos). `POST /work-queue/:id/pay` (quitação individual, sem desconto) usa o mesmo serviço por baixo (`payment.service.js`), garantindo que todo pagamento — em lote ou individual — apareça no mesmo extrato.

## Ações administrativas

| Ação | Permissão exigida | Quem tem por padrão |
|---|---|---|
| Cadastrar/editar ateliê | `ateliers:write` | owner, admin |
| Emitir lote | `work-queue:write` | owner, admin |
| Avançar etapa (confirmar recebimento / acabamento pronto) | `work-queue:advance` | owner, admin, ateliê (só nas próprias transições) |
| Coletar / descarregar / aprovar auditoria | `work-queue:advance` + validação de papel na `stateMachine` (`ROLE_ADMIN_OWNER`) | owner, admin |
| Reverter etapa | `work-queue:write` + checagem de owner no controller | owner |
| Marcar pago (individual ou em lote) / aplicar bônus | `payments:manage` | owner |
| Ajustar saldo de adiantamento do ateliê | `payments:manage` | owner |
| Ver extrato/comprovante de pagamentos | `payments:manage` | owner |
| Gerenciar usuários staff / roles | `users:manage` / `roles:manage` | owner |

## Isolamento de dados do ateliê

Toda query feita por um principal do tipo `atelier` é automaticamente escopada ao próprio `atelierId` (do token, nunca de parâmetro de rota livre) — corrige a falha do legado onde um faccionista podia, em tese, consultar dados de outro trocando o ID na URL.

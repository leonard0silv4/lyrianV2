# Arquitetura — Lyria Ateliês (V2)

Sistema novo, isolado do legado (`new-crawler` + `crawler-backend`), publicado sob `/v2` no mesmo domínio. Ver decisão completa em `/Users/leo/.claude/plans/quero-que-voc-fa-a-purrfect-mochi.md`.

## Backend (`backend/`)

Node.js + Express + Mongoose, banco `lyria_ateliers` (mesmo cluster do legado, database separado).

```
src/
  modules/
    auth/         login staff + login ateliê, JWT
    users/        CRUD de usuários staff
    permissions/  Role + enum de Permission + middleware central
    ateliers/     CRUD de Ateliê + AtelierUser
    work-queue/   WorkItem: model, cálculos, máquina de estados, controller, dashboard
    payments/     PaymentBatch (extrato), payment.service (quitação em lote/individual), pixPayload
    audit/        AuditLog genérico (qualquer entidade)
  shared/
    middleware/   requireAuth, requirePermission
    db/           conexão Mongo
    pix.js        gera payload EMV "Pix copia e cola" (CRC16), sem chamada de rede/gateway
  app.js
  server.js
```

### Módulo `work-queue` (o motor da fila de trabalho)

- `workItem.model.js` — entidade Lote/Fardo (specs, metrics calculados, status, statusDates, paymentStatus).
- `calculations.js` — fórmulas de metros/orçamento/rolos de fita (portadas do legado, centralizadas).
- `stateMachine.js` — `ALLOWED_TRANSITIONS` + `WHO_CAN_TRANSITION`, valida toda transição de status.
- `financialAccess.js` — remove campos financeiros da resposta para quem não é owner.
- `workQueue.controller.js` — list, getById, create (emissão), transition, updateObservacao, pay, applyBonus, revert.
- `dashboard.controller.js` — agregação para o dashboard geral.

### Endpoints principais

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | Login staff |
| POST | `/auth/atelier/login` | — | Login ateliê |
| GET/POST/PUT | `/ateliers` | `ateliers:read`/`write` | CRUD ateliê |
| PATCH | `/ateliers/:id/active` | `ateliers:write` | Ativar/inativar |
| GET | `/work-queue` | `work-queue:read` | Lista lotes (escopado por ateliê se principal for ateliê) |
| POST | `/work-queue` | `work-queue:write` | Emitir novo lote |
| POST | `/work-queue/:id/transition` | `work-queue:advance` | Avançar/mudar status (validado por `stateMachine`) |
| POST | `/work-queue/:id/pay` | `payments:manage` (owner) | Marcar como pago |
| POST | `/work-queue/:id/apply-bonus` | `payments:manage` (owner) | Aplicar bônus percentual |
| POST | `/work-queue/:id/revert` | `work-queue:write` + owner | Reverter etapa |
| GET | `/work-queue/dashboard` | `work-queue:read` | Agregação para dashboard |
| PATCH | `/ateliers/:id/adiantamento` | `payments:manage` (owner) | Ajusta saldo de adiantamento do ateliê |
| GET | `/payments` | `payments:manage` (owner) | Extrato geral (histórico de quitações) |
| GET | `/payments/:id` | `payments:manage` (owner) | Comprovante de uma quitação |
| POST | `/payments` | `payments:manage` (owner) | Quita um ou mais lotes (`{atelierId, workItemIds, desconto}`), gera Pix payload |
| GET | `/audit` | `audit:read` | Histórico de qualquer entidade |

## Frontend (`frontend/`)

React + Vite, publicado com `base: '/v2/'`, `basename="/v2"` no router.

```
src/
  modules/
    auth/          AuthContext, LoginStaffPage, LoginAtelierPage (telas separadas)
    permissions/   usePermission (can/canAny/isOwner/isAtelier)
    ateliers/      AtelierListPage (grid de cards), AtelierFormModal (login sempre visível)
    work-queue/    MesaProducaoPage (seleção múltipla + totais agregados), DashboardPage,
                   PortalAtelierPage, LoteCard, NovoLoteModal, stageFlow.ts
    payments/      PagamentoPage (fechamento semanal), QuitacaoModal, ExtratoModal,
                   ComprovanteModal (QR code Pix via lib qrcodejs)
  shared/
    api/client.ts       axios + interceptor de token/401 (redireciona pro login certo por tipo de principal)
    theme.css           design tokens extraídos dos HTMLs de referência
    ui/                 Badge, Button, Card, KpiCard, PageHeader, SearchBox,
                         FilterPopover, ChecklistRow, Modal, StepSelector, PixQrCode
    components/         PrivateRoute, AppLayout (nav + logout)
  router.tsx
```

### Rotas do frontend

| Rota | Página | Quem acessa |
|---|---|---|
| `/login` | LoginStaffPage | público |
| `/login-atelie` | LoginAtelierPage | público |
| `/dashboard` | DashboardPage | staff com `work-queue:read` |
| `/ateliers` | AtelierListPage (cria/edita via modal) | staff com `ateliers:read`/`write` |
| `/ateliers/:id/mesa` | MesaProducaoPage | staff com `work-queue:read` |
| `/ateliers/:id/pagamento` | PagamentoPage | staff com `payments:manage` (owner) |
| `/portal` | PortalAtelierPage | ateliê logado |

## Design system

Paleta, tipografia (Inter + Courier New) e componentes extraídos literalmente dos HTMLs em `/Users/leo/Downloads/02 versao/` (telas 01, 02, 08). Detalhes em `frontend/src/shared/theme.css`.

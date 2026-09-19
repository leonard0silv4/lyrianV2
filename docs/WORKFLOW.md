# Fluxo de Ateliês

## 1. Cadastro de ateliê

Admin/Owner cria o ateliê em `/ateliers/novo` (`POST /ateliers`): dados PJ (nome fantasia, razão social, CNPJ, sigla de lote, banco, PIX, endereço) + login/senha de acesso do ateliê. Isso cria dois documentos: `Atelier` (dados da empresa) e `AtelierUser` (credencial de acesso), sempre auditados.

## 2. Atribuição de trabalho (emissão de lote)

Admin/Owner abre a Mesa de Produção do ateliê (`/ateliers/:id/mesa`) e clica "Novo Lote". O modal guia 4 passos (percentual de sombreamento → cor → largura da bobina → comprimento/quantidade), calculando em tempo real metros totais e rolos de fita. Ao confirmar, `POST /work-queue` cria o `WorkItem` com `status=em_atelie` e código sequencial (`SIGLA-0001`).

## 3. Fila de trabalho

Cada ateliê vê sua própria fila (Mesa de Produção para admin, Portal do Ateliê para o próprio ateliê). A fila é uma lista de `WorkItem`s ordenável por prioridade, filtrável por status, pesquisável por código.

## 4. Evolução de status

Ver tabela completa em `STATUS.md`. Resumo: o ateliê confirma recebimento e acabamento pronto (`em_atelie → em_producao → pronto`); a partir daí, só Admin/Owner move o lote (`coletado → descarregado → auditoria`). Toda transição passa por `POST /work-queue/:id/transition`, validada pela máquina de estados no backend — o frontend só mostra o botão de ação quando o principal tem permissão para aquela transição específica, mas a validação real é sempre no servidor.

## 5. Ações por perfil

- **Ateliê**: confirma recebimento, marca acabamento pronto. Vê sua fila agrupada em Aguardando/Em Andamento/Finalizados. Não vê valores financeiros, não pode coletar/descarregar/auditar/pagar/reverter.
- **Admin** (role sem `payments:manage`): tudo do ateliê + coletar, descarregar, auditar, emitir lotes, cadastrar ateliês. Não vê nem manipula valores financeiros.
- **Owner**: tudo do admin + ver valores (orçamento, bônus, pagamento), marcar como pago, aplicar bônus, reverter etapas.

## 6. Auditoria física do lote (barracão)

Tela dedicada em `/v2/auditoria` (`AuditoriaPage.tsx`), separada do checklist de status. Lista lotes `descarregado` (aguardando conferência), `auditoria_aprovada` e `auditoria_divergente`.

Ao clicar "Auditar" (`AuditoriaModal.tsx`, `POST /work-queue/:id/transition`), o operador registra:
- **Conforme ou Divergente** (`toStatus=auditoria_aprovada|auditoria_divergente`).
- Se divergente: **quantidade real** de peças no fardo (`quantidadeAuditada`, 1-50) e **observação** livre (mínimo 5 caracteres).
- Se o lote físico veio com **SKU/medida diferente do pedido** (ex.: pedido 8x8, recebido 9x9): opção "Lote veio com SKU/medida diferente do esperado", que grava o SKU real em `WorkItem.skuAuditado`. Esse campo é isolado de `specs.measurementId`/`metrics.orcamento` — **não muda a medida do pedido nem o valor a pagar ao ateliê**, só qual SKU recebe o estoque no BaseLinker.

Depois de auditado, "Lançar Estoque" (`POST /work-queue/:id/lancar-estoque`) envia `quantidadeAuditada` unidades pro BaseLinker, usando o SKU de `skuAuditado` quando informado, senão o SKU do `specs.measurementId` original.

A tela atualiza em tempo real via SSE (`useSse`, evento `workItemUpdated`), sem necessidade de refetch manual.

## 7. Log de auditoria (trilha de mudanças)

Toda criação, atualização e mudança de status gera um registro em `AuditLog` (entidade, usuário, ação, campo, valor anterior/novo, timestamp), consultável via `GET /audit`. Distinto da "Auditoria física" da seção 6 — aqui é só o histórico genérico de mudanças de qualquer entidade.

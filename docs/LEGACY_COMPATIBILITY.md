# Compatibilidade com o legado

O V2 (`lyria_ateliers`) é um sistema isolado — não chama nenhum endpoint do legado (`crawler-backend`) em runtime, e usa um banco MongoDB separado (`lyria_ateliers`, mesmo cluster). A "compatibilidade" aqui é de **conhecimento de negócio portado**, não de integração de dados em tempo real.

## Funcionalidades reaproveitadas (mesma regra, código novo)

- Fórmula de metros/orçamento/rolos de fita (`custoPorMetro=0.4`, fórmula com/sem emenda, fator de fita 0.35/48) — validada com os mesmos inputs/outputs do legado.
- Conceito de checklist de etapas do lote (recebimento → acabamento → coleta → descarga → auditoria) — formalizado como máquina de estados.
- Isolamento multi-tenant por ateliê (equivalente ao `ownerId`/`faccionistaId` do legado).
- Auditoria de mudanças (equivalente ao `Log`/`LogController`), agora genérica para qualquer entidade.
- Pagamento como estado derivado da auditoria aprovada (equivalente a `pago`/`dataPgto`).
- Autenticação separada para a entidade operacional (ateliê) vs. equipe interna (staff), equivalente ao login de faccionista vs. usuário — agora com telas de login dedicadas (`/login` vs `/login-atelie`).
- Fechamento financeiro semanal com quitação Pix, extrato geral e comprovante (equivalente à tela 05 do legado/referência), incluindo desconto de adiantamento sobre o bruto. Diferença deliberada: o V2 gera um QR code Pix real (payload EMV padrão Bacen) a partir da chave Pix cadastrada — o legado/referência só exibia a chave em texto para transferência manual.

## Funcionalidades adaptadas

- **Faccionista → Ateliê**: ganhou CNPJ, razão social, sigla de lote — collection própria (`Atelier`), não mais misturada com o model de usuário de sistema.
- **Status booleanos → máquina de estados única** (`status` enum + tabela de transições permitidas). Ver `STATUS.md`.
- **RBAC morto do legado → RBAC efetivamente usado**: o legado tinha `Role`/`Permission` mas nenhum middleware os consultava; aqui todo endpoint passa por `requirePermission`.

## Funcionalidades construídas após a entrega inicial

- **Tela de Auditoria dedicada** (`AuditoriaPage.tsx` / `AuditoriaModal.tsx`, backend `workQueue.controller.js:transition`) — divergência com quantidade real auditada e observação livre, distinta do checklist de etapas. Ver `WORKFLOW.md`.
- **Lançamento de estoque no BaseLinker** (`lancarEstoque`, `baselinkerStock.service.js`) — integração real com o ERP, disparada manualmente a partir da tela de Auditoria após o lote ser aprovado ou marcado divergente.
- **Correção de SKU divergente na auditoria** — quando o lote físico chega com SKU/medida diferente do pedido original, o auditor registra o SKU realmente recebido (`WorkItem.skuAuditado`) direto no modal de auditoria. Esse campo é isolado de `specs`/`metrics.orcamento`: só afeta qual SKU recebe o incremento de estoque no BaseLinker, nunca o valor a pagar ao ateliê.
- **Tempo real via SSE** (`useSse`, `sse.broadcastWorkItem`) — a tela de Auditoria (e outras do work-queue) atualiza automaticamente com eventos do servidor, substituindo o refetch manual do legado.

## Não reaproveitado (fora de escopo)

- Telas 06/07 (parametrização de engenharia, PCP semanal por SKU).
- Comprovante em PDF real (o V2 usa "Imprimir" do navegador em vez de gerar um arquivo PDF) e importação de dados existentes de faccionistas — não implementados nesta rodada.

## Diferenças de comportamento deliberadas

Ver seção "Bugs do legado corrigidos" em `STATUS.md` — nenhum desses comportamentos problemáticos do legado foi replicado no V2.

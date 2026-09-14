const WorkItem = require("../work-queue/workItem.model");
const Atelier = require("../ateliers/atelier.model");
const PaymentBatch = require("./paymentBatch.model");
const auditService = require("../audit/audit.service");
const { buildPixPayload } = require("../../shared/pix");

class PaymentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "PaymentError";
    this.statusCode = statusCode;
  }
}

/**
 * Quita um conjunto de WorkItems de um mesmo atelie, aplicando (opcionalmente)
 * um desconto de adiantamento limitado ao valor bruto e ao saldo do atelie.
 * Gera um PaymentBatch (linha do extrato) e o payload Pix "copia e cola".
 */
async function payItems({ atelierId, workItemIds, desconto, user }) {
  if (!workItemIds?.length) {
    throw new PaymentError("Selecione ao menos um lote para quitar");
  }

  const atelier = await Atelier.findById(atelierId);
  if (!atelier) {
    throw new PaymentError("Atelie nao encontrado", 404);
  }
  if (!atelier.chavePix) {
    throw new PaymentError("Atelie nao possui chave Pix cadastrada");
  }

  const items = await WorkItem.find({ _id: { $in: workItemIds }, atelierId });
  if (items.length !== workItemIds.length) {
    throw new PaymentError("Algum lote nao pertence a este atelie ou nao foi encontrado", 404);
  }
  const notReady = items.find((i) => i.paymentStatus !== "liberado");
  if (notReady) {
    throw new PaymentError(`Lote ${notReady.code} nao esta liberado para pagamento`);
  }

  const itemValor = (i) => (i.metrics.orcamento || 0) + (i.bonus || 0);
  const valorBruto = Math.round(items.reduce((s, i) => s + itemValor(i), 0) * 100) / 100;
  const descontoSolicitado = Math.max(0, Number(desconto) || 0);
  const descontoAplicado = Math.round(Math.min(descontoSolicitado, valorBruto, atelier.saldoAdiantamento || 0) * 100) / 100;
  const valorLiquido = Math.round((valorBruto - descontoAplicado) * 100) / 100;

  const now = new Date();
  for (const item of items) {
    item.paymentStatus = "pago";
    item.dataPgto = now;
    await item.save();
  }

  atelier.saldoAdiantamento = Math.round(((atelier.saldoAdiantamento || 0) - descontoAplicado) * 100) / 100;
  await atelier.save();

  const pixPayload = buildPixPayload({
    pixKey: atelier.chavePix,
    merchantName: atelier.razaoSocial || atelier.nomeFantasia,
    merchantCity: "BRASIL",
    amount: valorLiquido,
  });

  const batch = await PaymentBatch.create({
    atelierId,
    items: items.map((i) => ({
      workItemId: i._id,
      code: i.code,
      totalMetros: i.metrics.totalMetros,
      valor: itemValor(i),
      orcamento: i.metrics.orcamento,
      bonus: i.bonus || 0,
    })),
    valorBruto,
    desconto: descontoAplicado,
    valorLiquido,
    pixKey: atelier.chavePix,
    beneficiario: atelier.razaoSocial,
    banco: atelier.banco,
    pixPayload,
    createdBy: user.id,
  });

  for (const item of items) {
    await auditService.record({
      entityType: "WorkItem",
      entityId: item._id,
      user,
      action: "status_change",
      field: "paymentStatus",
      oldValue: "liberado",
      newValue: "pago",
    });
  }
  await auditService.record({
    entityType: "PaymentBatch",
    entityId: batch._id,
    user,
    action: "create",
    newValue: { atelierId: String(atelierId), valorLiquido, desconto: descontoAplicado, itens: items.length },
  });

  return batch;
}

module.exports = { payItems, PaymentError };

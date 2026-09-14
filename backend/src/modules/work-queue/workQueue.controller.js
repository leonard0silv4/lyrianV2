const WorkItem = require("./workItem.model");
const Atelier = require("../ateliers/atelier.model");
const auditService = require("../audit/audit.service");
const { calculateMetrics } = require("./calculations");
const { assertTransition, dateFieldFor, TransitionError } = require("./stateMachine");
const { stripFinancials, stripFinancialsList, isOwner } = require("./financialAccess");
const { payItems, PaymentError } = require("../payments/payment.service");

function scopeToAtelier(req, filter) {
  if (req.user.principalType === "atelier") {
    return { ...filter, atelierId: req.user.atelierId };
  }
  return filter;
}

async function list(req, res) {
  const { atelierId, status } = req.query;
  let filter = {};
  if (atelierId) filter.atelierId = atelierId;
  if (status) filter.status = status;
  filter = scopeToAtelier(req, filter);

  const items = await WorkItem.find(filter).sort({ priority: -1, createdAt: -1 });
  res.json(stripFinancialsList(items, req.user));
}

async function getById(req, res) {
  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }
  res.json(stripFinancials(item, req.user));
}

async function create(req, res) {
  const {
    atelierId,
    percentualSombreamento,
    corTecido,
    corHex,
    larguraBobina,
    comprimentoBobina,
    quantidadeFardo,
    emenda,
  } = req.body;

  if (!atelierId || !percentualSombreamento || !corTecido || !larguraBobina || !comprimentoBobina || !quantidadeFardo) {
    return res.status(400).json({ message: "Campos obrigatorios da especificacao do lote ausentes" });
  }

  const atelier = await Atelier.findById(atelierId);
  if (!atelier) {
    return res.status(404).json({ message: "Atelie nao encontrado" });
  }

  const metrics = calculateMetrics({ larguraBobina, comprimentoBobina, quantidadeFardo, emenda });

  const count = await WorkItem.countDocuments({ atelierId }).setOptions({ bypassMiddleware: true });
  const sequencial = String(count + 1).padStart(4, "0");
  const code = `${atelier.siglaLote}-${sequencial}`;

  const item = await WorkItem.create({
    atelierId,
    code,
    specs: { percentualSombreamento, corTecido, corHex, larguraBobina, comprimentoBobina, quantidadeFardo, emenda: Boolean(emenda) },
    metrics,
    status: "criado",
    statusDates: { criadoEm: new Date() },
    createdBy: req.user.id,
  });

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "create",
    newValue: { code: item.code, atelierId: String(atelierId), status: item.status },
  });

  res.status(201).json(stripFinancials(item, req.user));
}

async function transition(req, res) {
  const { toStatus, observacao } = req.body;
  if (!toStatus) {
    return res.status(400).json({ message: "toStatus e obrigatorio" });
  }

  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  try {
    assertTransition({
      currentStatus: item.status,
      toStatus,
      principal: req.user,
      isOwnAtelier: req.user.principalType === "atelier" && String(item.atelierId) === req.user.atelierId,
    });
  } catch (err) {
    if (err instanceof TransitionError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    throw err;
  }

  const before = item.status;
  item.status = toStatus;

  const dateField = dateFieldFor(toStatus);
  if (dateField) {
    item.statusDates[dateField] = new Date();
  }

  if (toStatus === "auditoria_aprovada") {
    item.paymentStatus = "liberado";
  }

  if (observacao !== undefined) {
    item.observacao = observacao;
  }

  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "status_change",
    field: "status",
    oldValue: before,
    newValue: toStatus,
  });

  res.json(stripFinancials(item, req.user));
}

const STATUS_ORDER = [
  "criado",
  "em_atelie",
  "em_producao",
  "pronto",
  "coletado",
  "descarregado",
  "auditoria_aprovada",
];
const QR_CONFIRM_STEP = {
  atelier: { from: "criado", to: "em_atelie" },
  staff: { from: "pronto", to: "coletado" },
};

/**
 * Confirmacao via QR code impresso na etiqueta do lote.
 * O status de destino depende de quem escaneia: o proprio atelie confirma
 * recebimento fisico do lote (criado -> em_atelie); admin/owner confirma coleta (pronto -> coletado).
 * Idempotente: se o lote ja passou dessa etapa, retorna alreadyConfirmed sem repetir a transicao.
 */
async function confirmByQr(req, res) {
  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const role = req.user.principalType === "atelier" ? "atelier" : "staff";
  const { from, to: toStatus } = QR_CONFIRM_STEP[role];
  const currentIndex = STATUS_ORDER.indexOf(item.status);
  const fromIndex = STATUS_ORDER.indexOf(from);

  if (item.status !== from) {
    if (currentIndex > fromIndex) {
      return res.json({ alreadyConfirmed: true, item: stripFinancials(item, req.user) });
    }
    return res.status(409).json({
      message: `Lote precisa estar em "${from}" para confirmar por QR (status atual: ${item.status})`,
    });
  }

  try {
    assertTransition({
      currentStatus: item.status,
      toStatus,
      principal: req.user,
      isOwnAtelier: req.user.principalType === "atelier" && String(item.atelierId) === req.user.atelierId,
    });
  } catch (err) {
    if (err instanceof TransitionError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    throw err;
  }

  const before = item.status;
  item.status = toStatus;
  const dateField = dateFieldFor(toStatus);
  if (dateField) {
    item.statusDates[dateField] = new Date();
  }
  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "status_change",
    field: "status",
    oldValue: before,
    newValue: toStatus,
  });

  res.json({ alreadyConfirmed: false, item: stripFinancials(item, req.user) });
}

async function updateObservacao(req, res) {
  const { observacao } = req.body;
  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = item.observacao;
  item.observacao = observacao;
  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "update",
    field: "observacao",
    oldValue: before,
    newValue: observacao,
  });

  res.json(stripFinancials(item, req.user));
}

async function pay(req, res) {
  if (!isOwner(req.user)) {
    return res.status(403).json({ message: "Somente owner pode registrar pagamento" });
  }

  const item = await WorkItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  try {
    await payItems({ atelierId: item.atelierId, workItemIds: [item._id], desconto: 0, user: req.user });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    throw err;
  }

  const updated = await WorkItem.findById(req.params.id);
  res.json(stripFinancials(updated, req.user));
}

async function applyBonus(req, res) {
  if (!isOwner(req.user)) {
    return res.status(403).json({ message: "Somente owner pode aplicar bonus" });
  }

  const { percentage } = req.body;
  if (percentage === undefined || percentage < 0 || percentage > 100) {
    return res.status(400).json({ message: "percentage deve estar entre 0 e 100" });
  }

  const item = await WorkItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = item.bonus;
  item.bonus = Math.round(((item.metrics.orcamento || 0) * percentage) / 100 * 100) / 100;
  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "update",
    field: "bonus",
    oldValue: before,
    newValue: item.bonus,
  });

  res.json(stripFinancials(item, req.user));
}

async function applyBonusBulk(req, res) {
  if (!isOwner(req.user)) {
    return res.status(403).json({ message: "Somente owner pode aplicar bonus" });
  }

  const { workItemIds, percentage } = req.body;
  if (!Array.isArray(workItemIds) || workItemIds.length === 0) {
    return res.status(400).json({ message: "workItemIds e obrigatorio" });
  }
  if (percentage === undefined || percentage < 0 || percentage > 100) {
    return res.status(400).json({ message: "percentage deve estar entre 0 e 100" });
  }

  const items = await WorkItem.find({ _id: { $in: workItemIds } });
  const updated = [];
  for (const item of items) {
    const before = item.bonus;
    item.bonus = Math.round((((item.metrics.orcamento || 0) * percentage) / 100) * 100) / 100;
    await item.save();
    await auditService.record({
      entityType: "WorkItem",
      entityId: item._id,
      user: req.user,
      action: "update",
      field: "bonus",
      oldValue: before,
      newValue: item.bonus,
    });
    updated.push(item);
  }

  res.json(stripFinancialsList(updated, req.user));
}

async function rate(req, res) {
  if (req.user.principalType === "atelier") {
    return res.status(403).json({ message: "Somente equipe pode avaliar o lote" });
  }

  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating deve estar entre 1 e 5" });
  }

  const item = await WorkItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = item.rating;
  item.rating = rating;
  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "update",
    field: "rating",
    oldValue: before,
    newValue: rating,
  });

  res.json(stripFinancials(item, req.user));
}

async function updateSpecs(req, res) {
  const { larguraBobina, comprimentoBobina, quantidadeFardo, emenda } = req.body;

  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = { specs: item.specs.toObject(), metrics: item.metrics.toObject() };

  if (larguraBobina !== undefined) item.specs.larguraBobina = larguraBobina;
  if (comprimentoBobina !== undefined) item.specs.comprimentoBobina = comprimentoBobina;
  if (quantidadeFardo !== undefined) item.specs.quantidadeFardo = quantidadeFardo;
  if (emenda !== undefined) item.specs.emenda = Boolean(emenda);

  item.metrics = calculateMetrics({
    larguraBobina: item.specs.larguraBobina,
    comprimentoBobina: item.specs.comprimentoBobina,
    quantidadeFardo: item.specs.quantidadeFardo,
    emenda: item.specs.emenda,
  });

  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "update",
    field: "specs",
    oldValue: before,
    newValue: { specs: item.specs.toObject(), metrics: item.metrics.toObject() },
  });

  res.json(stripFinancials(item, req.user));
}

async function setArchived(req, res) {
  const { isArchived } = req.body;

  const item = await WorkItem.findById(req.params.id).setOptions({ bypassMiddleware: true });
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = item.isArchived;
  item.isArchived = Boolean(isArchived);
  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "update",
    field: "isArchived",
    oldValue: before,
    newValue: item.isArchived,
  });

  res.json(stripFinancials(item, req.user));
}

async function revert(req, res) {
  if (!isOwner(req.user)) {
    return res.status(403).json({ message: "Somente owner pode reverter etapa" });
  }

  const { toStatus, motivo } = req.body;
  if (!toStatus || !motivo) {
    return res.status(400).json({ message: "toStatus e motivo sao obrigatorios" });
  }

  const item = await WorkItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = item.status;
  item.status = toStatus;
  if (toStatus !== "auditoria_aprovada") {
    item.paymentStatus = "pendente";
  }
  await item.save();

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "status_change",
    field: "status",
    oldValue: before,
    newValue: toStatus,
  });
  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "update",
    field: "observacao_reversao",
    newValue: motivo,
  });

  res.json(stripFinancials(item, req.user));
}

module.exports = {
  list,
  getById,
  create,
  transition,
  confirmByQr,
  updateObservacao,
  pay,
  applyBonus,
  applyBonusBulk,
  rate,
  updateSpecs,
  setArchived,
  revert,
};

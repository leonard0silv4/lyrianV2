const WorkItem = require("./workItem.model");
const Atelier = require("../ateliers/atelier.model");
const Measurement = require("../measurements/measurement.model");
const auditService = require("../audit/audit.service");
const { calculateMetrics } = require("./calculations");
const { assertTransition, assertCooldown, dateFieldFor, TransitionError } = require("./stateMachine");
const { stripFinancials, stripFinancialsList, isOwner } = require("./financialAccess");
const { payItems, PaymentError } = require("../payments/payment.service");
const sse = require("../realtime/sse.service");
const baselinkerStock = require("../../shared/baselinker/baselinkerStock.service");
const { BaseLinkerError } = require("../../shared/baselinker/baselinkerClient");

function scopeToAtelier(req, filter) {
  if (req.user.principalType === "atelier") {
    return { ...filter, atelierId: req.user.atelierId };
  }
  return filter;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// FilterPopover no frontend permite selecionar varios valores; o cliente
// manda esses valores concatenados por virgula num unico query param.
function toFilterValue(raw) {
  if (!raw) return undefined;
  const values = String(raw)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : { $in: values };
}

// Mesma logica de busca por codigo ou dimensao (ex.: "4x3") usada no filtro client-side
// do DashboardPage; replicada aqui via $expr/$regexMatch para poder rodar no servidor.
function applySearch(filter, q) {
  const raw = q.trim().toLowerCase();
  if (!raw) return filter;

  const dimsMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)$/);
  if (dimsMatch) {
    const larguraQ = escapeRegex(dimsMatch[1].replace(",", "."));
    const comprimentoQ = escapeRegex(dimsMatch[2].replace(",", "."));
    return {
      ...filter,
      $expr: {
        $and: [
          { $regexMatch: { input: { $toString: "$specs.larguraBobina" }, regex: larguraQ } },
          { $regexMatch: { input: { $toString: "$specs.comprimentoBobina" }, regex: comprimentoQ } },
        ],
      },
    };
  }

  const term = escapeRegex(raw.replace(/m$/, ""));
  return {
    ...filter,
    $or: [
      { code: { $regex: term, $options: "i" } },
      { $expr: { $regexMatch: { input: { $toString: "$specs.larguraBobina" }, regex: term } } },
    ],
  };
}

const LIST_SAFETY_LIMIT = 1000;
const MAX_PAGE_SIZE = 200;

async function list(req, res) {
  const { atelierId, status, paymentStatus, estoqueStatus, q, page, limit } = req.query;
  let filter = {};
  const atelierIdFilter = toFilterValue(atelierId);
  if (atelierIdFilter) filter.atelierId = atelierIdFilter;
  const statusFilter = toFilterValue(status);
  if (statusFilter) filter.status = statusFilter;
  const paymentStatusFilter = toFilterValue(paymentStatus);
  if (paymentStatusFilter) filter.paymentStatus = paymentStatusFilter;
  const estoqueStatusFilter = toFilterValue(estoqueStatus);
  if (estoqueStatusFilter) filter["estoqueBaseLinker.status"] = estoqueStatusFilter;
  if (q) filter = applySearch(filter, q);
  filter = scopeToAtelier(req, filter);

  const sort = { priority: -1, createdAt: -1 };

  if (page) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      WorkItem.find(filter).sort(sort).skip(skip).limit(limitNum),
      WorkItem.countDocuments(filter),
    ]);

    return res.json({
      items: stripFinancialsList(items, req.user),
      total,
      page: pageNum,
      limit: limitNum,
    });
  }

  // Sem paginacao explicita: mantem o array puro (contrato atual, usado por
  // MesaProducaoPage/PagamentoPage/PortalAtelierPage), mas com um teto de
  // seguranca para nunca devolver uma colecao sem limite nenhum.
  const items = await WorkItem.find(filter).sort(sort).limit(LIST_SAFETY_LIMIT);
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
    measurementId,
    larguraBobina,
    comprimentoBobina,
    quantidadeFardo,
    emenda,
  } = req.body;

  if (!atelierId || !percentualSombreamento || !corTecido || !quantidadeFardo) {
    return res.status(400).json({ message: "Campos obrigatorios da especificacao do lote ausentes" });
  }
  if (!measurementId && (larguraBobina === undefined || comprimentoBobina === undefined)) {
    return res.status(400).json({ message: "Informe measurementId ou larguraBobina e comprimentoBobina" });
  }

  const atelier = await Atelier.findById(atelierId);
  if (!atelier) {
    return res.status(404).json({ message: "Atelie nao encontrado" });
  }

  let measurement = null;
  if (measurementId) {
    measurement = await Measurement.findById(measurementId);
    if (!measurement) {
      return res.status(404).json({ message: "Medida nao encontrada" });
    }
  }

  const resolvedLargura = larguraBobina !== undefined ? larguraBobina : measurement.larguraBobina;
  const resolvedComprimento = comprimentoBobina !== undefined ? comprimentoBobina : measurement.comprimentoBobina;
  const resolvedEmenda = emenda !== undefined ? Boolean(emenda) : measurement ? measurement.emendaPadrao : false;

  const metrics = calculateMetrics({
    larguraBobina: resolvedLargura,
    comprimentoBobina: resolvedComprimento,
    quantidadeFardo,
    emenda: resolvedEmenda,
  });

  const count = await WorkItem.countDocuments({ atelierId }).setOptions({ bypassMiddleware: true });
  const sequencial = String(count + 1).padStart(4, "0");
  const code = `${atelier.siglaLote}-${sequencial}`;

  const item = await WorkItem.create({
    atelierId,
    code,
    specs: {
      percentualSombreamento,
      corTecido,
      corHex,
      measurementId: measurement?._id,
      larguraBobina: resolvedLargura,
      comprimentoBobina: resolvedComprimento,
      quantidadeFardo,
      emenda: resolvedEmenda,
    },
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

const AUDITORIA_STATUSES = ["auditoria_aprovada", "auditoria_divergente"];

async function transition(req, res) {
  const { toStatus, observacao, quantidadeAuditada } = req.body;
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
    assertCooldown({
      currentStatus: item.status,
      toStatus,
      principal: req.user,
      statusDates: item.statusDates,
    });
  } catch (err) {
    if (err instanceof TransitionError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    throw err;
  }

  if (AUDITORIA_STATUSES.includes(toStatus)) {
    if (item.estoqueBaseLinker?.status === "lancado") {
      return res.status(409).json({
        message: "Lote ja lancado no BaseLinker — nao e possivel reauditar sem antes corrigir o estoque manualmente",
      });
    }
    if (toStatus === "auditoria_divergente") {
      const qtd = Number(quantidadeAuditada);
      if (!qtd || qtd < 1 || qtd > 50) {
        return res.status(400).json({ message: "Informe a quantidade real auditada (entre 1 e 50)" });
      }
      if (!observacao || observacao.trim().length < 5) {
        return res.status(400).json({ message: "Descreva a divergencia encontrada (minimo 5 caracteres)" });
      }
      item.quantidadeAuditada = qtd;
    } else {
      item.quantidadeAuditada = quantidadeAuditada !== undefined ? Number(quantidadeAuditada) : item.specs.quantidadeFardo;
    }
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

  // O "reason" e o campo que a tela de Logs destaca visualmente — sem ele, a
  // observacao/quantidade de uma auditoria (ex.: divergente) ficava so como o
  // status bruto "Descarregado -> Em Analise", sem nenhum detalhe do que foi
  // apurado, mesmo com o operador tendo preenchido tudo certo no modal.
  const auditReason = AUDITORIA_STATUSES.includes(toStatus)
    ? `Qtd. auditada: ${item.quantidadeAuditada} un.${observacao ? ` — ${observacao}` : ""}`
    : observacao;

  await auditService.record({
    entityType: "WorkItem",
    entityId: item._id,
    user: req.user,
    action: "status_change",
    field: "status",
    oldValue: before,
    newValue: toStatus,
    reason: auditReason,
  });
  sse.broadcastWorkItem("workItemUpdated", item);

  res.json(stripFinancials(item, req.user));
}

async function lancarEstoque(req, res) {
  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  if (!AUDITORIA_STATUSES.includes(item.status)) {
    return res.status(409).json({ message: "Lote precisa estar auditado (conforme ou divergente) para lancar estoque" });
  }
  if (item.estoqueBaseLinker?.status === "lancado") {
    return res.status(409).json({ message: "Este lote ja foi lancado no BaseLinker" });
  }
  if (!item.quantidadeAuditada) {
    return res.status(409).json({ message: "Lote sem quantidade auditada registrada" });
  }

  const measurement = await Measurement.findById(item.specs.measurementId);
  const sku = measurement?.sku;
  if (!sku) {
    return res.status(422).json({ message: "A medida deste lote nao tem SKU cadastrado" });
  }

  try {
    const resultado = await baselinkerStock.incrementStock(sku, item.quantidadeAuditada);
    item.estoqueBaseLinker = {
      status: "lancado",
      quantidadeEnviada: resultado.quantidadeEnviada,
      baseLinkerProductId: resultado.productId,
      lancadoEm: new Date(),
    };
    await item.save();

    await auditService.record({
      entityType: "WorkItem",
      entityId: item._id,
      user: req.user,
      action: "update",
      field: "estoqueBaseLinker",
      newValue: { sku, ...resultado },
    });
    sse.broadcastWorkItem("workItemUpdated", item);

    return res.json(stripFinancials(item, req.user));
  } catch (err) {
    if (err instanceof BaseLinkerError) {
      item.estoqueBaseLinker = {
        ...(item.estoqueBaseLinker?.toObject ? item.estoqueBaseLinker.toObject() : item.estoqueBaseLinker),
        status: "erro",
        ultimoErro: err.message,
      };
      await item.save();
      return res.status(502).json({ message: err.message });
    }
    throw err;
  }
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
  sse.broadcastWorkItem("workItemUpdated", item);

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
  sse.broadcastWorkItem("workItemUpdated", item);

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
  const { measurementId, larguraBobina, comprimentoBobina, quantidadeFardo, emenda } = req.body;

  const filter = scopeToAtelier(req, { _id: req.params.id });
  const item = await WorkItem.findOne(filter);
  if (!item) {
    return res.status(404).json({ message: "Trabalho nao encontrado" });
  }

  const before = { specs: item.specs.toObject(), metrics: item.metrics.toObject() };

  let measurement = null;
  if (measurementId !== undefined) {
    if (measurementId) {
      measurement = await Measurement.findById(measurementId);
      if (!measurement) {
        return res.status(404).json({ message: "Medida nao encontrada" });
      }
      item.specs.measurementId = measurement._id;
    } else {
      item.specs.measurementId = undefined;
    }
  }

  if (larguraBobina !== undefined) item.specs.larguraBobina = larguraBobina;
  else if (measurement) item.specs.larguraBobina = measurement.larguraBobina;
  if (comprimentoBobina !== undefined) item.specs.comprimentoBobina = comprimentoBobina;
  else if (measurement) item.specs.comprimentoBobina = measurement.comprimentoBobina;
  if (quantidadeFardo !== undefined) item.specs.quantidadeFardo = quantidadeFardo;
  if (emenda !== undefined) item.specs.emenda = Boolean(emenda);
  else if (measurement) item.specs.emenda = measurement.emendaPadrao;

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
  sse.broadcastWorkItem("workItemUpdated", item);

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
    reason: motivo,
  });
  sse.broadcastWorkItem("workItemUpdated", item);

  res.json(stripFinancials(item, req.user));
}

module.exports = {
  list,
  getById,
  create,
  transition,
  lancarEstoque,
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

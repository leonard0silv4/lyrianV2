const mongoose = require("mongoose");
const WorkItem = require("./workItem.model");
const Atelier = require("../ateliers/atelier.model");
const { isOwner } = require("./financialAccess");

function round2(value) {
  return Math.round((value || 0) * 100) / 100;
}

// Agregado no MongoDB em vez de trazer todos os WorkItems para a memoria do
// Node e reduzir em JS: o custo passa a depender do plano de execucao do
// Mongo (com indice em atelierId/isArchived), nao do numero de lotes existentes.
async function getDashboard(req, res) {
  const matchFilter = { isArchived: { $ne: true } };
  if (req.user.principalType === "atelier") {
    matchFilter.atelierId = new mongoose.Types.ObjectId(req.user.atelierId);
  }

  const AUDITORIA_STATUSES = ["descarregado", "auditoria_aprovada", "auditoria_divergente"];

  const [statusRows, auditoriaRows, atelierRows, totalsRow] = await Promise.all([
    WorkItem.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Conta os 4 estados "visiveis" da tela de Auditoria (que combinam o status
    // do lote com o status do lancamento no BaseLinker num unico contador cada),
    // pra os KPIs da tela nao precisarem inferir isso a partir da lista paginada.
    WorkItem.aggregate([
      { $match: { ...matchFilter, status: { $in: AUDITORIA_STATUSES } } },
      {
        $group: {
          _id: { status: "$status", estoqueStatus: { $ifNull: ["$estoqueBaseLinker.status", "pendente"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    WorkItem.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$atelierId",
          totalLotes: { $sum: 1 },
          totalMetros: { $sum: { $ifNull: ["$metrics.totalMetros", 0] } },
        },
      },
    ]),
    WorkItem.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalLotes: { $sum: 1 },
          totalMetros: { $sum: { $ifNull: ["$metrics.totalMetros", 0] } },
          lotesLiberados: { $sum: { $cond: [{ $eq: ["$paymentStatus", "liberado"] }, 1, 0] } },
          metrosLiberados: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "liberado"] }, { $ifNull: ["$metrics.totalMetros", 0] }, 0] },
          },
          valorLiberado: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "liberado"] }, { $ifNull: ["$metrics.orcamento", 0] }, 0] },
          },
        },
      },
    ]),
  ]);

  const porStatus = {};
  for (const row of statusRows) {
    porStatus[row._id] = row.count;
  }

  const auditoria = { aguardando: 0, conforme: 0, divergente: 0, lancadoEstoque: 0 };
  for (const row of auditoriaRows) {
    const { status, estoqueStatus } = row._id;
    if (estoqueStatus === "lancado") {
      auditoria.lancadoEstoque += row.count;
    } else if (status === "descarregado") {
      auditoria.aguardando += row.count;
    } else if (status === "auditoria_aprovada") {
      auditoria.conforme += row.count;
    } else if (status === "auditoria_divergente") {
      auditoria.divergente += row.count;
    }
  }

  const ateliers = atelierRows.length
    ? await Atelier.find({ _id: { $in: atelierRows.map((row) => row._id) } }, "nomeFantasia siglaLote")
    : [];
  const atelierById = new Map(ateliers.map((a) => [String(a._id), a]));

  const porAtelier = atelierRows.map((row) => {
    const atelier = atelierById.get(String(row._id));
    return {
      atelierId: String(row._id),
      nomeFantasia: atelier?.nomeFantasia,
      siglaLote: atelier?.siglaLote,
      totalLotes: row.totalLotes,
      totalMetros: round2(row.totalMetros),
    };
  });

  const totals = totalsRow[0] || { totalLotes: 0, totalMetros: 0, lotesLiberados: 0, metrosLiberados: 0, valorLiberado: 0 };

  const response = {
    totalLotes: totals.totalLotes,
    totalMetros: round2(totals.totalMetros),
    porStatus,
    porAtelier,
    auditoria,
  };

  if (isOwner(req.user)) {
    response.pagamento = {
      lotesLiberados: totals.lotesLiberados,
      metrosLiberados: round2(totals.metrosLiberados),
      valorLiberado: round2(totals.valorLiberado),
    };
  }

  res.json(response);
}

module.exports = { getDashboard };

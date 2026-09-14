const WorkItem = require("./workItem.model");
const { isOwner } = require("./financialAccess");

async function getDashboard(req, res) {
  const matchFilter = {};
  if (req.user.principalType === "atelier") {
    matchFilter.atelierId = req.user.atelierId;
  }

  const items = await WorkItem.find(matchFilter).populate("atelierId", "nomeFantasia siglaLote");

  const porStatus = {};
  const porAtelier = {};
  let totalMetros = 0;
  let lotesLiberadosPgto = 0;
  let metrosLiberadosPgto = 0;
  let valorLiberadoPgto = 0;

  for (const item of items) {
    porStatus[item.status] = (porStatus[item.status] || 0) + 1;

    const atelier = item.atelierId;
    const atelierKey = atelier ? String(atelier._id) : "desconhecido";
    if (!porAtelier[atelierKey]) {
      porAtelier[atelierKey] = {
        atelierId: atelierKey,
        nomeFantasia: atelier?.nomeFantasia,
        siglaLote: atelier?.siglaLote,
        totalLotes: 0,
        totalMetros: 0,
      };
    }
    porAtelier[atelierKey].totalLotes += 1;
    porAtelier[atelierKey].totalMetros += item.metrics?.totalMetros || 0;

    totalMetros += item.metrics?.totalMetros || 0;

    if (item.paymentStatus === "liberado") {
      lotesLiberadosPgto += 1;
      metrosLiberadosPgto += item.metrics?.totalMetros || 0;
      valorLiberadoPgto += item.metrics?.orcamento || 0;
    }
  }

  const response = {
    totalLotes: items.length,
    totalMetros: Math.round(totalMetros * 100) / 100,
    porStatus,
    porAtelier: Object.values(porAtelier),
  };

  if (isOwner(req.user)) {
    response.pagamento = {
      lotesLiberados: lotesLiberadosPgto,
      metrosLiberados: Math.round(metrosLiberadosPgto * 100) / 100,
      valorLiberado: Math.round(valorLiberadoPgto * 100) / 100,
    };
  }

  res.json(response);
}

module.exports = { getDashboard };

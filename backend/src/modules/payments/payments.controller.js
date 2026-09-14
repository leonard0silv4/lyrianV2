const PaymentBatch = require("./paymentBatch.model");
const { payItems, PaymentError } = require("./payment.service");

async function list(req, res) {
  const { atelierId } = req.query;
  const filter = {};
  if (atelierId) filter.atelierId = atelierId;
  const batches = await PaymentBatch.find(filter).sort({ createdAt: -1 }).populate("atelierId", "nomeFantasia siglaLote");
  res.json(batches);
}

async function getById(req, res) {
  const batch = await PaymentBatch.findById(req.params.id).populate("atelierId", "nomeFantasia siglaLote cnpj");
  if (!batch) {
    return res.status(404).json({ message: "Comprovante nao encontrado" });
  }
  res.json(batch);
}

async function createBatch(req, res) {
  const { atelierId, workItemIds, desconto } = req.body;
  try {
    const batch = await payItems({ atelierId, workItemIds, desconto, user: req.user });
    res.status(201).json(batch);
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    throw err;
  }
}

module.exports = { list, getById, createBatch };

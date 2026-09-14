const Measurement = require("./measurement.model");
const auditService = require("../audit/audit.service");

async function list(req, res) {
  const measurements = await Measurement.find().sort({ larguraBobina: 1 });
  res.json(measurements);
}

async function getById(req, res) {
  const measurement = await Measurement.findById(req.params.id);
  if (!measurement) {
    return res.status(404).json({ message: "Medida nao encontrada" });
  }
  res.json(measurement);
}

async function create(req, res) {
  const { larguraBobina, comprimentoBobina, unidade, emendaPadrao } = req.body;

  if (larguraBobina === undefined || larguraBobina <= 0 || comprimentoBobina === undefined || comprimentoBobina <= 0) {
    return res.status(400).json({ message: "larguraBobina e comprimentoBobina sao obrigatorias e devem ser maiores que zero" });
  }

  let measurement;
  try {
    measurement = await Measurement.create({
      larguraBobina,
      comprimentoBobina,
      unidade,
      emendaPadrao: Boolean(emendaPadrao),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Medida ja cadastrada para essa largura x comprimento" });
    }
    throw err;
  }

  await auditService.record({
    entityType: "Measurement",
    entityId: measurement._id,
    user: req.user,
    action: "create",
    newValue: measurement.toObject(),
  });

  res.status(201).json(measurement);
}

async function update(req, res) {
  const measurement = await Measurement.findById(req.params.id);
  if (!measurement) {
    return res.status(404).json({ message: "Medida nao encontrada" });
  }

  const before = measurement.toObject();
  const { larguraBobina, comprimentoBobina, unidade, emendaPadrao } = req.body;

  if (larguraBobina !== undefined) measurement.larguraBobina = larguraBobina;
  if (comprimentoBobina !== undefined) measurement.comprimentoBobina = comprimentoBobina;
  if (unidade !== undefined) measurement.unidade = unidade;
  if (emendaPadrao !== undefined) measurement.emendaPadrao = Boolean(emendaPadrao);

  try {
    await measurement.save();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Medida ja cadastrada para essa largura x comprimento" });
    }
    throw err;
  }

  await auditService.record({
    entityType: "Measurement",
    entityId: measurement._id,
    user: req.user,
    action: "update",
    oldValue: before,
    newValue: measurement.toObject(),
  });

  res.json(measurement);
}

async function setActive(req, res) {
  const { ativo } = req.body;
  const measurement = await Measurement.findById(req.params.id);
  if (!measurement) {
    return res.status(404).json({ message: "Medida nao encontrada" });
  }

  const before = measurement.ativo;
  measurement.ativo = Boolean(ativo);
  await measurement.save();

  await auditService.record({
    entityType: "Measurement",
    entityId: measurement._id,
    user: req.user,
    action: "status_change",
    field: "ativo",
    oldValue: before,
    newValue: measurement.ativo,
  });

  res.json(measurement);
}

module.exports = { list, getById, create, update, setActive };

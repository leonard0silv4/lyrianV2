const bcrypt = require("bcryptjs");
const Atelier = require("./atelier.model");
const AtelierUser = require("./atelierUser.model");
const auditService = require("../audit/audit.service");

async function list(req, res) {
  if (req.user.principalType === "atelier") {
    const atelier = await Atelier.findById(req.user.atelierId);
    return res.json(atelier ? [atelier] : []);
  }
  const ateliers = await Atelier.find().sort({ nomeFantasia: 1 });
  res.json(ateliers);
}

async function getById(req, res) {
  if (req.user.principalType === "atelier" && req.params.id !== req.user.atelierId) {
    return res.status(403).json({ message: "Permissao negada" });
  }
  const atelier = await Atelier.findById(req.params.id);
  if (!atelier) {
    return res.status(404).json({ message: "Atelie nao encontrado" });
  }
  const atelierUser = await AtelierUser.findOne({ atelierId: atelier._id });
  res.json({ ...atelier.toObject(), login: atelierUser?.username });
}

async function create(req, res) {
  const {
    nomeFantasia,
    razaoSocial,
    cnpj,
    siglaLote,
    telefone,
    enderecoCompleto,
    banco,
    chavePix,
    login,
    senha,
  } = req.body;

  if (!nomeFantasia || !razaoSocial || !cnpj || !siglaLote || !login || !senha) {
    return res.status(400).json({
      message: "nomeFantasia, razaoSocial, cnpj, siglaLote, login e senha sao obrigatorios",
    });
  }

  const atelier = await Atelier.create({
    nomeFantasia,
    razaoSocial,
    cnpj,
    siglaLote,
    telefone,
    enderecoCompleto,
    banco,
    chavePix,
  });

  const passwordHash = await bcrypt.hash(senha, 10);
  await AtelierUser.create({
    atelierId: atelier._id,
    username: login.toLowerCase(),
    passwordHash,
  });

  await auditService.record({
    entityType: "Atelier",
    entityId: atelier._id,
    user: req.user,
    action: "create",
    newValue: { nomeFantasia, cnpj, siglaLote },
  });

  res.status(201).json(atelier);
}

async function update(req, res) {
  const atelier = await Atelier.findById(req.params.id);
  if (!atelier) {
    return res.status(404).json({ message: "Atelie nao encontrado" });
  }

  const before = atelier.toObject();
  const fields = [
    "nomeFantasia",
    "razaoSocial",
    "cnpj",
    "siglaLote",
    "telefone",
    "enderecoCompleto",
    "banco",
    "chavePix",
  ];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      atelier[field] = req.body[field];
    }
  }
  await atelier.save();

  if (req.body.senha) {
    const atelierUser = await AtelierUser.findOne({ atelierId: atelier._id });
    if (atelierUser) {
      atelierUser.passwordHash = await bcrypt.hash(req.body.senha, 10);
      await atelierUser.save();
    }
  }

  await auditService.record({
    entityType: "Atelier",
    entityId: atelier._id,
    user: req.user,
    action: "update",
    oldValue: before,
    newValue: atelier.toObject(),
  });

  res.json(atelier);
}

async function setActive(req, res) {
  const { active } = req.body;
  const atelier = await Atelier.findById(req.params.id);
  if (!atelier) {
    return res.status(404).json({ message: "Atelie nao encontrado" });
  }

  const before = atelier.active;
  atelier.active = Boolean(active);
  await atelier.save();

  await AtelierUser.updateMany({ atelierId: atelier._id }, { active: atelier.active });

  await auditService.record({
    entityType: "Atelier",
    entityId: atelier._id,
    user: req.user,
    action: "status_change",
    field: "active",
    oldValue: before,
    newValue: atelier.active,
  });

  res.json(atelier);
}

async function setAdiantamento(req, res) {
  const { saldoAdiantamento } = req.body;
  if (saldoAdiantamento === undefined || saldoAdiantamento < 0) {
    return res.status(400).json({ message: "saldoAdiantamento invalido" });
  }

  const atelier = await Atelier.findById(req.params.id);
  if (!atelier) {
    return res.status(404).json({ message: "Atelie nao encontrado" });
  }

  const before = atelier.saldoAdiantamento;
  atelier.saldoAdiantamento = Number(saldoAdiantamento);
  await atelier.save();

  await auditService.record({
    entityType: "Atelier",
    entityId: atelier._id,
    user: req.user,
    action: "update",
    field: "saldoAdiantamento",
    oldValue: before,
    newValue: atelier.saldoAdiantamento,
  });

  res.json(atelier);
}

module.exports = { list, getById, create, update, setActive, setAdiantamento };

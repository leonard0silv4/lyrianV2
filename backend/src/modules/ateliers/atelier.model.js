const mongoose = require("mongoose");

const atelierSchema = new mongoose.Schema(
  {
    nomeFantasia: { type: String, required: true, trim: true },
    razaoSocial: { type: String, required: true, trim: true },
    cnpj: { type: String, required: true, unique: true, trim: true },
    siglaLote: { type: String, required: true, unique: true, uppercase: true, trim: true },
    telefone: { type: String, trim: true },
    enderecoCompleto: { type: String, trim: true },
    banco: { type: String, trim: true },
    chavePix: { type: String, trim: true },
    active: { type: Boolean, default: true },
    saldoAdiantamento: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Atelier", atelierSchema);

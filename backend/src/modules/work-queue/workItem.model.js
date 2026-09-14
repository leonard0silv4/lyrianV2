const mongoose = require("mongoose");

const STATUS_VALUES = [
  "criado",
  "em_atelie",
  "em_producao",
  "pronto",
  "coletado",
  "descarregado",
  "auditoria_aprovada",
  "auditoria_divergente",
];

const PAYMENT_STATUS_VALUES = ["pendente", "liberado", "pago"];

const workItemSchema = new mongoose.Schema(
  {
    atelierId: { type: mongoose.Schema.Types.ObjectId, ref: "Atelier", required: true },
    code: { type: String, required: true, unique: true },

    specs: {
      percentualSombreamento: { type: Number, required: true },
      corTecido: { type: String, required: true },
      corHex: { type: String },
      larguraBobina: { type: Number, required: true },
      comprimentoBobina: { type: Number, required: true },
      quantidadeFardo: { type: Number, required: true },
      emenda: { type: Boolean, default: false },
    },

    metrics: {
      totalMetros: { type: Number, default: 0 },
      qtdRolos: { type: Number, default: 0 },
      orcamento: { type: Number, default: 0 },
    },

    status: { type: String, enum: STATUS_VALUES, default: "criado" },
    statusDates: {
      criadoEm: { type: Date },
      emAtelieEm: { type: Date },
      emProducaoEm: { type: Date },
      prontoEm: { type: Date },
      coletadoEm: { type: Date },
      descarregadoEm: { type: Date },
      auditoriaEm: { type: Date },
    },

    paymentStatus: { type: String, enum: PAYMENT_STATUS_VALUES, default: "pendente" },
    dataPgto: { type: Date },
    bonus: { type: Number, default: 0 },
    advancedMoneyPayment: { type: Number, default: 0 },

    priority: { type: Number, default: 0 },
    observacao: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

workItemSchema.pre(/^find/, function (next) {
  if (!this.getOptions().bypassMiddleware) {
    this.where({ isArchived: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("WorkItem", workItemSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.PAYMENT_STATUS_VALUES = PAYMENT_STATUS_VALUES;

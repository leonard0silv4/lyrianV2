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

const ESTOQUE_BASELINKER_STATUS = ["pendente", "lancado", "erro"];

const workItemSchema = new mongoose.Schema(
  {
    atelierId: { type: mongoose.Schema.Types.ObjectId, ref: "Atelier", required: true },
    code: { type: String, required: true, unique: true },

    specs: {
      percentualSombreamento: { type: Number, required: true },
      corTecido: { type: String, required: true },
      corHex: { type: String },
      larguraBobina: { type: Number, required: true },
      measurementId: { type: mongoose.Schema.Types.ObjectId, ref: "Measurement" },
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

    // Quantidade real de pecas apuradas na auditoria fisica do barracao
    // (pode divergir de specs.quantidadeFardo, que e o planejado na emissao).
    quantidadeAuditada: { type: Number },

    // SKU/measurement realmente recebido, quando diverge do esperado em specs.measurementId
    // (ex.: lote pedido como 8x8 chegou fisicamente como 9x9). Usado apenas para o lancamento
    // de estoque no BaseLinker; nao altera specs nem metrics.orcamento (nao mexe em pagamento).
    skuAuditado: { type: mongoose.Schema.Types.ObjectId, ref: "Measurement" },

    estoqueBaseLinker: {
      status: { type: String, enum: ESTOQUE_BASELINKER_STATUS, default: "pendente" },
      quantidadeEnviada: { type: Number },
      baseLinkerProductId: { type: String },
      lancadoEm: { type: Date },
      ultimoErro: { type: String },
    },

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

workItemSchema.index({ atelierId: 1, isArchived: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model("WorkItem", workItemSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.PAYMENT_STATUS_VALUES = PAYMENT_STATUS_VALUES;
module.exports.ESTOQUE_BASELINKER_STATUS = ESTOQUE_BASELINKER_STATUS;

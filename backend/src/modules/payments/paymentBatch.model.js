const mongoose = require("mongoose");

const paymentBatchSchema = new mongoose.Schema(
  {
    atelierId: { type: mongoose.Schema.Types.ObjectId, ref: "Atelier", required: true },
    items: [
      {
        workItemId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkItem" },
        code: String,
        totalMetros: Number,
        valor: Number,
        orcamento: Number,
        bonus: Number,
      },
    ],
    valorBruto: { type: Number, required: true },
    desconto: { type: Number, default: 0 },
    valorLiquido: { type: Number, required: true },
    pixKey: { type: String, required: true },
    beneficiario: { type: String },
    banco: { type: String },
    pixPayload: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentBatch", paymentBatchSchema);

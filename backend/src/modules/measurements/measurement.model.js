const mongoose = require("mongoose");

const measurementSchema = new mongoose.Schema(
  {
    larguraBobina: { type: Number, required: true },
    comprimentoBobina: { type: Number, required: true },
    unidade: { type: String, default: "m" },
    emendaPadrao: { type: Boolean, default: false },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

measurementSchema.index({ larguraBobina: 1, comprimentoBobina: 1 }, { unique: true });

module.exports = mongoose.model("Measurement", measurementSchema);

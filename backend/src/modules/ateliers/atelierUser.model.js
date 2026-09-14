const mongoose = require("mongoose");

const atelierUserSchema = new mongoose.Schema(
  {
    atelierId: { type: mongoose.Schema.Types.ObjectId, ref: "Atelier", required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AtelierUser", atelierUserSchema);

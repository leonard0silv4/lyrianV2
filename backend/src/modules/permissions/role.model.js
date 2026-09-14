const mongoose = require("mongoose");
const { ALL_PERMISSIONS } = require("./constants");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: String, enum: ALL_PERMISSIONS }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);

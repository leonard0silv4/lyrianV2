require("express-async-errors");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const rolesRoutes = require("./modules/permissions/roles.routes");
const ateliersRoutes = require("./modules/ateliers/ateliers.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const workQueueRoutes = require("./modules/work-queue/workQueue.routes");
const paymentsRoutes = require("./modules/payments/payments.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/roles", rolesRoutes);
app.use("/ateliers", ateliersRoutes);
app.use("/audit", auditRoutes);
app.use("/work-queue", workQueueRoutes);
app.use("/payments", paymentsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : "Erro interno" });
});

module.exports = app;

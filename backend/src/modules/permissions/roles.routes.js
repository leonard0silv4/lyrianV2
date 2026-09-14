const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS, ALL_PERMISSIONS } = require("./constants");
const Role = require("./role.model");

const router = express.Router();

router.get("/permissions", requireAuth, (req, res) => {
  res.json(ALL_PERMISSIONS);
});

router.get("/", requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });
  res.json(roles);
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) {
    return res.status(400).json({ message: "name e obrigatorio" });
  }
  const role = await Role.create({ name, description, permissions: permissions || [] });
  res.status(201).json(role);
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const { name, description, permissions } = req.body;
  const role = await Role.findById(req.params.id);
  if (!role) {
    return res.status(404).json({ message: "Role nao encontrada" });
  }
  if (name !== undefined) role.name = name;
  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;
  await role.save();
  res.json(role);
});

module.exports = router;

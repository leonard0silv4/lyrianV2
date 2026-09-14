const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS } = require("../permissions/constants");
const controller = require("./ateliers.controller");

const router = express.Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.ATELIERS_READ), controller.list);
router.get("/:id", requireAuth, requirePermission(PERMISSIONS.ATELIERS_READ), controller.getById);
router.post("/", requireAuth, requirePermission(PERMISSIONS.ATELIERS_WRITE), controller.create);
router.put("/:id", requireAuth, requirePermission(PERMISSIONS.ATELIERS_WRITE), controller.update);
router.patch("/:id/active", requireAuth, requirePermission(PERMISSIONS.ATELIERS_WRITE), controller.setActive);
router.patch("/:id/adiantamento", requireAuth, requirePermission(PERMISSIONS.PAYMENTS_MANAGE), controller.setAdiantamento);

module.exports = router;

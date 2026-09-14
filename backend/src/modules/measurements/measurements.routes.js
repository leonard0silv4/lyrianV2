const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS } = require("../permissions/constants");
const controller = require("./measurements.controller");

const router = express.Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.MEASUREMENTS_READ), controller.list);
router.get("/:id", requireAuth, requirePermission(PERMISSIONS.MEASUREMENTS_READ), controller.getById);
router.post("/", requireAuth, requirePermission(PERMISSIONS.MEASUREMENTS_WRITE), controller.create);
router.put("/:id", requireAuth, requirePermission(PERMISSIONS.MEASUREMENTS_WRITE), controller.update);
router.patch("/:id/active", requireAuth, requirePermission(PERMISSIONS.MEASUREMENTS_WRITE), controller.setActive);

module.exports = router;

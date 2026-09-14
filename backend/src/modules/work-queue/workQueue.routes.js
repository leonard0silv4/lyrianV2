const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS } = require("../permissions/constants");
const controller = require("./workQueue.controller");
const { getDashboard } = require("./dashboard.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/dashboard", requirePermission(PERMISSIONS.WORK_QUEUE_READ), getDashboard);

router.get("/", requirePermission(PERMISSIONS.WORK_QUEUE_READ), controller.list);
router.get("/:id", requirePermission(PERMISSIONS.WORK_QUEUE_READ), controller.getById);
router.post("/", requirePermission(PERMISSIONS.WORK_QUEUE_WRITE), controller.create);
router.post("/:id/transition", requirePermission(PERMISSIONS.WORK_QUEUE_ADVANCE), controller.transition);
router.post("/:id/confirm-qr", requirePermission(PERMISSIONS.WORK_QUEUE_ADVANCE), controller.confirmByQr);
router.put("/:id/observacao", requirePermission(PERMISSIONS.WORK_QUEUE_ADVANCE), controller.updateObservacao);
router.post("/:id/pay", requirePermission(PERMISSIONS.PAYMENTS_MANAGE), controller.pay);
router.post("/:id/apply-bonus", requirePermission(PERMISSIONS.PAYMENTS_MANAGE), controller.applyBonus);
router.post("/apply-bonus-bulk", requirePermission(PERMISSIONS.PAYMENTS_MANAGE), controller.applyBonusBulk);
router.post("/:id/rate", requirePermission(PERMISSIONS.WORK_QUEUE_WRITE), controller.rate);
router.put("/:id/specs", requirePermission(PERMISSIONS.WORK_QUEUE_WRITE), controller.updateSpecs);
router.patch("/:id/archive", requirePermission(PERMISSIONS.WORK_QUEUE_WRITE), controller.setArchived);
router.post("/:id/revert", requirePermission(PERMISSIONS.WORK_QUEUE_WRITE), controller.revert);

module.exports = router;

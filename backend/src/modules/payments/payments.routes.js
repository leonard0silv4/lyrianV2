const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS } = require("../permissions/constants");
const controller = require("./payments.controller");

const router = express.Router();

router.use(requireAuth, requirePermission(PERMISSIONS.PAYMENTS_MANAGE));

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.createBatch);

module.exports = router;

const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS } = require("../permissions/constants");
const controller = require("./users.controller");

const router = express.Router();

router.use(requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE));

router.get("/", controller.list);
router.post("/", controller.create);
router.put("/:id", controller.update);

module.exports = router;

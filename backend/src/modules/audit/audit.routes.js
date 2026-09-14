const express = require("express");
const { requireAuth, requirePermission } = require("../../shared/middleware/auth");
const { PERMISSIONS } = require("../permissions/constants");
const { listByEntity } = require("./audit.service");

const router = express.Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.AUDIT_READ), async (req, res) => {
  const { entityType, entityId, page, limit } = req.query;
  const result = await listByEntity({
    entityType,
    entityId,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
  res.json(result);
});

module.exports = router;

const AuditLog = require("./auditLog.model");

async function record({ entityType, entityId, user, action, field, oldValue, newValue }) {
  return AuditLog.create({
    entityType,
    entityId,
    userId: user?.id,
    userRole: user?.roleName || user?.principalType,
    action,
    field,
    oldValue,
    newValue,
  });
}

async function listByEntity({ entityType, entityId, page = 1, limit = 20 }) {
  const query = {};
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

module.exports = { record, listByEntity };

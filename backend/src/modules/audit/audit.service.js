const AuditLog = require("./auditLog.model");
const WorkItem = require("../work-queue/workItem.model");
const User = require("../users/user.model");
const AtelierUser = require("../ateliers/atelierUser.model");

async function record({ entityType, entityId, user, action, field, oldValue, newValue, reason }) {
  return AuditLog.create({
    entityType,
    entityId,
    userId: user?.id,
    userRole: user?.roleName || user?.principalType,
    action,
    field,
    oldValue,
    newValue,
    reason,
  });
}

async function enrich(items) {
  const workItemIds = [...new Set(items.filter((i) => i.entityType === "WorkItem").map((i) => String(i.entityId)))];
  const userIds = [...new Set(items.map((i) => i.userId).filter(Boolean))];

  const [workItems, staffUsers, atelierUsers] = await Promise.all([
    workItemIds.length
      ? WorkItem.find({ _id: { $in: workItemIds } }, "code").setOptions({ bypassMiddleware: true })
      : [],
    userIds.length ? User.find({ _id: { $in: userIds } }, "username") : [],
    userIds.length ? AtelierUser.find({ _id: { $in: userIds } }, "username") : [],
  ]);

  const codeById = new Map(workItems.map((w) => [String(w._id), w.code]));
  const nameById = new Map([
    ...staffUsers.map((u) => [String(u._id), u.username]),
    ...atelierUsers.map((u) => [String(u._id), u.username]),
  ]);

  return items.map((item) => {
    const plain = item.toObject ? item.toObject() : item;
    return {
      ...plain,
      entityCode: plain.entityType === "WorkItem" ? codeById.get(String(plain.entityId)) : undefined,
      userName: nameById.get(String(plain.userId)),
    };
  });
}

async function list({ entityType, entityId, action, dateFrom, dateTo, page = 1, limit = 20 }) {
  const query = {};
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (dateFrom || dateTo) {
    query.timestamp = {};
    if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
    if (dateTo) query.timestamp.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  const [rawItems, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query),
  ]);

  const items = await enrich(rawItems);

  return { items, total, page, limit };
}

async function listByEntity(params) {
  return list(params);
}

module.exports = { record, list, listByEntity };

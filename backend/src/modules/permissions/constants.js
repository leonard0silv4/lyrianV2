const PERMISSIONS = Object.freeze({
  USERS_MANAGE: "users:manage",
  ROLES_MANAGE: "roles:manage",
  ATELIERS_READ: "ateliers:read",
  ATELIERS_WRITE: "ateliers:write",
  MEASUREMENTS_READ: "measurements:read",
  MEASUREMENTS_WRITE: "measurements:write",
  WORK_QUEUE_READ: "work-queue:read",
  WORK_QUEUE_WRITE: "work-queue:write",
  WORK_QUEUE_ADVANCE: "work-queue:advance",
  WORK_QUEUE_BASELINKER_PUSH: "work-queue:baselinker-push",
  AUDIT_READ: "audit:read",
  PAYMENTS_MANAGE: "payments:manage",
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

module.exports = { PERMISSIONS, ALL_PERMISSIONS };

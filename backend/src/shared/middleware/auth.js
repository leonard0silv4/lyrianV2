const { verifyToken } = require("../../modules/auth/jwt");
const User = require("../../modules/users/user.model");
const Role = require("../../modules/permissions/role.model");
const AtelierUser = require("../../modules/ateliers/atelierUser.model");
const { PERMISSIONS } = require("../../modules/permissions/constants");

const ATELIER_PERMISSIONS = [
  PERMISSIONS.ATELIERS_READ,
  PERMISSIONS.WORK_QUEUE_READ,
  PERMISSIONS.WORK_QUEUE_ADVANCE,
];

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) {
      return res.status(401).json({ message: "Token ausente" });
    }

    const payload = verifyToken(token);

    if (payload.type === "staff") {
      const user = await User.findById(payload.sub).populate("roleId");
      if (!user || !user.active) {
        return res.status(401).json({ message: "Usuario invalido" });
      }
      req.user = {
        id: String(user._id),
        principalType: "staff",
        roleName: user.roleId?.name,
        permissions: user.roleId?.permissions || [],
      };
      return next();
    }

    if (payload.type === "atelier") {
      const atelierUser = await AtelierUser.findById(payload.sub);
      if (!atelierUser || !atelierUser.active) {
        return res.status(401).json({ message: "Usuario invalido" });
      }
      req.user = {
        id: String(atelierUser._id),
        principalType: "atelier",
        atelierId: String(atelierUser.atelierId),
        permissions: ATELIER_PERMISSIONS,
      };
      return next();
    }

    return res.status(401).json({ message: "Token invalido" });
  } catch (err) {
    return res.status(401).json({ message: "Token invalido ou expirado" });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: "Permissao negada" });
    }
    return next();
  };
}

module.exports = { requireAuth, requirePermission };

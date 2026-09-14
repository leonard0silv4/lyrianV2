const bcrypt = require("bcryptjs");
const User = require("./user.model");
const Role = require("../permissions/role.model");
const auditService = require("../audit/audit.service");

async function list(req, res) {
  const users = await User.find().populate("roleId").sort({ createdAt: -1 });
  res.json(
    users.map((u) => ({
      id: u._id,
      username: u.username,
      name: u.name,
      active: u.active,
      role: u.roleId?.name,
      lastLoginAt: u.lastLoginAt,
    }))
  );
}

async function create(req, res) {
  const { username, password, name, roleId } = req.body;
  if (!username || !password || !roleId) {
    return res.status(400).json({ message: "username, password e roleId sao obrigatorios" });
  }

  const role = await Role.findById(roleId);
  if (!role) {
    return res.status(400).json({ message: "Role invalida" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username: username.toLowerCase(), passwordHash, name, roleId });

  await auditService.record({
    entityType: "User",
    entityId: user._id,
    user: req.user,
    action: "create",
    newValue: { username: user.username, roleId: String(roleId) },
  });

  res.status(201).json({ id: user._id, username: user.username });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, roleId, active, password } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "Usuario nao encontrado" });
  }

  const before = { name: user.name, roleId: String(user.roleId), active: user.active };

  if (name !== undefined) user.name = name;
  if (roleId !== undefined) user.roleId = roleId;
  if (active !== undefined) user.active = active;
  if (password) user.passwordHash = await bcrypt.hash(password, 10);

  await user.save();

  await auditService.record({
    entityType: "User",
    entityId: user._id,
    user: req.user,
    action: "update",
    oldValue: before,
    newValue: { name: user.name, roleId: String(user.roleId), active: user.active },
  });

  res.json({ id: user._id });
}

module.exports = { list, create, update };

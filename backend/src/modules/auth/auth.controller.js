const bcrypt = require("bcryptjs");
const User = require("../users/user.model");
const AtelierUser = require("../ateliers/atelierUser.model");
const { signToken } = require("./jwt");

async function loginStaff(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username e password sao obrigatorios" });
  }

  const user = await User.findOne({ username: username.toLowerCase(), active: true }).populate("roleId");
  if (!user) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({ sub: String(user._id), type: "staff" });

  return res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.roleId?.name,
      permissions: user.roleId?.permissions || [],
    },
  });
}

async function loginAtelier(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username e password sao obrigatorios" });
  }

  const atelierUser = await AtelierUser.findOne({ username: username.toLowerCase(), active: true });
  if (!atelierUser) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }

  const valid = await bcrypt.compare(password, atelierUser.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }

  atelierUser.lastLoginAt = new Date();
  await atelierUser.save();

  const token = signToken({ sub: String(atelierUser._id), type: "atelier", atelierId: String(atelierUser.atelierId) });

  return res.json({
    token,
    atelierUser: {
      id: atelierUser._id,
      username: atelierUser.username,
      atelierId: atelierUser.atelierId,
    },
  });
}

module.exports = { loginStaff, loginAtelier };

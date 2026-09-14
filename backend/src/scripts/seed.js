require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb } = require("../shared/db/connection");
const Role = require("../modules/permissions/role.model");
const User = require("../modules/users/user.model");
const { ALL_PERMISSIONS } = require("../modules/permissions/constants");

async function seed() {
  await connectDb();

  let ownerRole = await Role.findOne({ name: "owner" });
  if (!ownerRole) {
    ownerRole = await Role.create({
      name: "owner",
      description: "Acesso total ao sistema",
      permissions: ALL_PERMISSIONS,
    });
    console.log("Role 'owner' criada");
  }

  let adminRole = await Role.findOne({ name: "admin" });
  if (!adminRole) {
    adminRole = await Role.create({
      name: "admin",
      description: "Gestao operacional (sem gerenciar usuarios/roles)",
      permissions: ALL_PERMISSIONS.filter(
        (p) => p !== "users:manage" && p !== "roles:manage" && p !== "payments:manage"
      ),
    });
    console.log("Role 'admin' criada");
  }

  const username = process.env.SEED_OWNER_USERNAME || "owner";
  const password = process.env.SEED_OWNER_PASSWORD || "change-me-now";

  const existing = await User.findOne({ username });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      username,
      passwordHash,
      name: "Owner",
      roleId: ownerRole._id,
    });
    console.log(`Usuario owner criado: ${username} / ${password}`);
  } else {
    console.log("Usuario owner ja existe, nada a fazer");
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

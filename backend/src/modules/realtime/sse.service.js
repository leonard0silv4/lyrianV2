const { stripFinancials } = require("../work-queue/financialAccess");

let clients = [];

function addClient({ res, user }) {
  const client = {
    res,
    userId: user.id,
    principalType: user.principalType,
    atelierId: user.atelierId,
    roleName: user.roleName,
  };
  clients.push(client);
  return client;
}

function removeClient(client) {
  clients = clients.filter((c) => c !== client);
}

function canSeeItem(client, item) {
  if (client.principalType === "atelier") {
    return String(item.atelierId) === String(client.atelierId);
  }
  return true;
}

function broadcastWorkItem(event, item) {
  for (const client of clients) {
    if (!canSeeItem(client, item)) continue;
    const value = stripFinancials(item, { principalType: client.principalType, roleName: client.roleName });
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify({ item: value })}\n\n`);
  }
}

module.exports = { addClient, removeClient, broadcastWorkItem };

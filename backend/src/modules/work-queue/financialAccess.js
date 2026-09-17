function isOwner(principal) {
  return principal.principalType === "staff" && principal.roleName === "owner";
}

function isAtelier(principal) {
  return principal.principalType === "atelier";
}

/**
 * Owner: ve tudo.
 * Atelie: ve o valor (orcamento = mao de obra do proprio lote), o bonus e o status de pagamento,
 *   mas nao ve advancedMoneyPayment (extra controlado pelo owner).
 * Staff nao-owner (admin): nao ve nenhum campo financeiro.
 */
function stripFinancials(workItem, principal) {
  const plain = typeof workItem.toObject === "function" ? workItem.toObject() : { ...workItem };

  if (isOwner(principal)) {
    return plain;
  }

  if (isAtelier(principal)) {
    const { advancedMoneyPayment, ...rest } = plain;
    return rest;
  }

  const { metrics, ...rest } = plain;
  const { orcamento, ...metricsWithoutOrcamento } = metrics || {};

  return {
    ...rest,
    metrics: metricsWithoutOrcamento,
    bonus: undefined,
    advancedMoneyPayment: undefined,
    dataPgto: undefined,
    paymentStatus: undefined,
  };
}

function stripFinancialsList(items, principal) {
  return items.map((item) => stripFinancials(item, principal));
}

module.exports = { stripFinancials, stripFinancialsList, isOwner, isAtelier };

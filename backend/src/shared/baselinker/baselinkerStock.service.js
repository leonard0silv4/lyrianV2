const { callBaseLinker, BaseLinkerError } = require("./baselinkerClient");

// updateInventoryProductsStock SETA o valor absoluto de estoque por deposito —
// nao soma. Por isso toda gravacao aqui e sempre precedida de uma leitura do
// estoque atual do SKU, para que o incremento da auditoria seja somado ao que
// ja existe no BaseLinker, e nao sobrescreva o saldo da loja.

async function getStockBySku(sku) {
  const inventoryId = requireInventoryId();
  const warehouseId = requireWarehouseId();

  const data = await callBaseLinker("getInventoryProductsList", {
    inventory_id: inventoryId,
    filter_sku: sku,
  });

  const products = Object.values(data.products || {});
  if (products.length === 0) {
    throw new BaseLinkerError(`Nenhum produto encontrado no BaseLinker para o SKU "${sku}"`);
  }
  if (products.length > 1) {
    throw new BaseLinkerError(`Mais de um produto encontrado no BaseLinker para o SKU "${sku}"`);
  }

  const product = products[0];
  const estoqueAtual = Number(product.stock?.[warehouseId] || 0);
  return { productId: String(product.id), estoqueAtual };
}

async function incrementStock(sku, quantidade) {
  if (!quantidade || quantidade <= 0) {
    throw new BaseLinkerError("Quantidade a lancar deve ser maior que zero");
  }

  const inventoryId = requireInventoryId();
  const warehouseId = requireWarehouseId();
  const { productId, estoqueAtual } = await getStockBySku(sku);
  const novoTotal = estoqueAtual + quantidade;

  await callBaseLinker("updateInventoryProductsStock", {
    inventory_id: inventoryId,
    products: {
      [productId]: { [warehouseId]: novoTotal },
    },
  });

  return { productId, estoqueAnterior: estoqueAtual, quantidadeEnviada: quantidade, novoTotal };
}

function requireInventoryId() {
  const inventoryId = process.env.BASELINKER_INVENTORY_ID;
  if (!inventoryId) throw new BaseLinkerError("BASELINKER_INVENTORY_ID nao configurado");
  return Number(inventoryId);
}

function requireWarehouseId() {
  const warehouseId = process.env.BASELINKER_WAREHOUSE_ID;
  if (!warehouseId) throw new BaseLinkerError("BASELINKER_WAREHOUSE_ID nao configurado");
  return warehouseId;
}

module.exports = { getStockBySku, incrementStock };

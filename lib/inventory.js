export function stockUnitLabel(unit, quantity) {
  return Number(quantity) === 1 ? "item" : "items";
}

export function formatStockQuantity(quantity, unit) {
  return `${Number(quantity) || 0} ${stockUnitLabel(unit, quantity)}`;
}

export function getSalePricing(product, saleMode = "package") {
  // A measurement (such as 1,000 ml) describes a package, not the number
  // of packages removed from inventory. Only products counted as pieces can
  // be sold as a multi-piece package.
  const packageSize =
    product.unit === "piece"
      ? Math.max(1, Math.floor(Number(product.measurement_value) || 1))
      : 1;
  const isItemSale = saleMode === "item";

  return {
    saleMode: isItemSale ? "item" : "package",
    stockItems: isItemSale ? 1 : packageSize,
    unitPrice: Number(isItemSale ? product.item_price : product.unit_price) || 0,
    label: isItemSale ? "item" : packageSize === 1 ? "item" : `package (${packageSize} items)`,
  };
}

export function canSellByItem(product) {
  return (
    product.unit === "piece" &&
    Number(product.measurement_value) > 1 &&
    Number(product.item_price) > 0
  );
}

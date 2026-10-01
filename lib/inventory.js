export function stockUnitLabel(unit, quantity) {
  return Number(quantity) === 1 ? "item" : "items";
}

export function formatStockQuantity(quantity, unit) {
  return `${Number(quantity) || 0} ${stockUnitLabel(unit, quantity)}`;
}

function hasPackagePrice(product) {
  return (
    product.unit === "piece" &&
    Number(product.measurement_value) > 1 &&
    Number(product.item_price) > 0 &&
    Number(product.unit_price) > 0 &&
    Number(product.item_price) !== Number(product.unit_price)
  );
}

export function getSalePricing(product, saleMode = "item") {
  const packageSize = Math.max(
    1,
    Math.floor(Number(product.measurement_value) || 1)
  );
  const sellPackage =
    saleMode === "package" && hasPackagePrice(product);

  return {
    saleMode: sellPackage ? "package" : "item",
    stockItems: sellPackage ? packageSize : 1,
    unitPrice: Number(
      sellPackage ? product.unit_price : product.item_price || product.unit_price
    ) || 0,
    label: sellPackage ? `package (${packageSize} items)` : "item",
  };
}

export function canSellByItem(product) {
  return hasPackagePrice(product);
}

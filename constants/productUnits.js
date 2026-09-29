export const PRODUCT_UNITS = [
  "kg",
  "grams",
  "oz",
  "ml",
  "piece",
];

export function formatProductUnit(unit) {
  return unit || "piece";
}

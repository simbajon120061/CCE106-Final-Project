export function formatCurrency(amount) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}\u20B1${Math.abs(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso) {
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso) {
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

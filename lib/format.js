export function formatCurrency(amount) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}\u20B1${Math.abs(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseStoredDate(value) {
  if (!value) return null;

  const text = String(value);
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T00:00:00Z`
    : `${text.replace(" ", "T")}${hasTimeZone ? "" : "Z"}`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso) {
  const d = parseStoredDate(iso);
  if (!d) return "Date unavailable";

  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso) {
  const d = parseStoredDate(iso);
  if (!d) return "Date unavailable";

  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

import * as FileSystem from "expo-file-system/legacy";

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function createSpreadsheetCsv(data) {
  const groups = [
    ["Debtors", data.debtors],
    ["Products", data.products],
    ["Sales", data.sales],
    ["Sale items", data.sale_items],
    ["Transactions", data.transactions],
  ];

  const lines = [
    ["Track and Tally spreadsheet backup"].map(escapeCsv).join(","),
    ["Exported at", data.exported_at].map(escapeCsv).join(","),
    "",
  ];

  for (const [title, records = []] of groups) {
    lines.push([title].map(escapeCsv).join(","));
    const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
    lines.push(columns.map(escapeCsv).join(","));
    for (const record of records) {
      lines.push(columns.map((column) => escapeCsv(record[column])).join(","));
    }
    lines.push("");
  }

  // A BOM makes Excel recognize UTF-8 characters such as ₱ correctly.
  return `\uFEFF${lines.join("\n")}`;
}

export async function saveSpreadsheetBackup(data, label = "backup") {
  const directory = `${FileSystem.documentDirectory}backups/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = String(label).replace(/[^a-z0-9_-]/gi, "-");
  const uri = `${directory}track-and-tally-${safeLabel}-${timestamp}.csv`;
  await FileSystem.writeAsStringAsync(uri, createSpreadsheetCsv(data), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return uri;
}

import Storage from "expo-sqlite/kv-store";

const KEY = "debtor-photo-draft";
const MAX_AGE_MS = 2 * 60 * 1000;

export function saveDebtorDraft(draft) {
  try {
    Storage.setItemSync(
      KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
    console.log("[draft] saved");
  } catch (error) {
    console.warn("[draft] save failed", error);
  }
}

export function loadDebtorDraft() {
  try {
    const raw = Storage.getItemSync(KEY);
    console.log("[draft] load ->", raw ? "found" : "none");
    if (!raw) return null;

    const draft = JSON.parse(raw);
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      Storage.removeItemSync(KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDebtorDraft() {
  try {
    Storage.removeItemSync(KEY);
  } catch {}
}
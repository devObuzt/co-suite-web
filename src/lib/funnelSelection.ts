const KEY = "sbc_selection";

export function loadSelection(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSelection(sel: Record<string, number>): void {
  sessionStorage.setItem(KEY, JSON.stringify(sel));
}

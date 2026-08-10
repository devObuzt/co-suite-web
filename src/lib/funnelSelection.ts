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

const PKG_KEY = "sbc_selected_package";

/** The single ready-made package the visitor picked, if any. */
export function loadPackage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PKG_KEY) || null;
}

export function savePackage(packageId: string | null): void {
  if (typeof window === "undefined") return;
  if (packageId) localStorage.setItem(PKG_KEY, packageId);
  else localStorage.removeItem(PKG_KEY);
}

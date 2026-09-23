/**
 * Audience prefill rules for the suite wizard — the dialect suggestion and the
 * country/city split.
 *
 * These live outside the page component on purpose: they are pure decisions
 * about AI output that have been wrong in production more than once (an
 * Arab-48 dialect on a Hebrew suite; a Galilee village in the country field),
 * and a rule nobody can unit-test is a rule that breaks quietly.
 */

// Arabs in Israel get exactly this dialect suggestion — no long AI-extracted
// descriptions in the field.
export const ARAB_48_DIALECT = "عربي - عرب الـ48";

// The Arab-48 suggestion is for Arabic-speaking suites run from Israel only:
// the UI language must be Arabic AND the audience's first language must be
// Arabic AND the audience must be in Israel. A Hebrew UI or a Hebrew-first
// audience never sees it — an AI-extracted dialect string that merely mentions
// "عرب" is NOT enough (owner decision 2026-09-23).
export function arab48Eligible(uiLang: string, langs: string[], countriesText: string) {
  if (uiLang !== "ar") return false;
  if ((langs[0] || "") !== "ar") return false;
  return /israel|إسرائيل|اسرائيل|ישראל/i.test(countriesText);
}

export function suggestedDialect(extracted: string, langs: string[], countriesText: string, uiLang: string) {
  if (arab48Eligible(uiLang, langs, countriesText)) return ARAB_48_DIALECT;
  // Never carry the Arab-48 label into a suite that is not eligible for it.
  return extracted.trim() === ARAB_48_DIALECT ? "" : extracted;
}

// The custom-country field holds ONLY a clean country name: no parenthetical
// AI notes, no leading city fragments. Israel-area audiences always get
// "إسرائيل" (localized) — never "فلسطين" or mixed forms (owner decision).
const EMPTY_AI_ANSWERS = new Set(["null", "none", "n/a", "na", "unknown", "undefined", "-"]);

/** An "else null" field comes back as the WORD "null" often enough to matter. */
export function aiText(value: unknown): string {
  const text = String(value ?? "").trim();
  return EMPTY_AI_ANSWERS.has(text.toLowerCase()) ? "" : text;
}

export function cleanCountryPrefill(raw: string, uiLang: string): string {
  const stripped = aiText(raw).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim().replace(/[،,\s]+$/, "");
  if (!stripped) return "";
  if (/إسرائيل|israel|ישראל|فلسطين|palestin/i.test(stripped)) {
    return uiLang === "ar" ? "إسرائيل" : uiLang === "he" ? "ישראל" : "Israel";
  }
  const parts = stripped.split(/[،,/]+/).map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : stripped;
}

// Splitting "city, country" on the comma only works when the comma is there.
// A local business usually names its town alone — "ירכא" — and the old rule
// read that single token as the COUNTRY, so a Galilee village became the
// targeting country and the city field stayed empty. A lone token is treated
// as a CITY now, and the country falls back to the visitor's IP country.
export function splitLocationPrefill(
  extractedCountry: string,
  extractedCity: string,
  rawLocation: string,
  ipCountry: string,
  uiLang: string,
): { country: string; city: string } {
  const country = cleanCountryPrefill(extractedCountry, uiLang);
  const city = aiText(extractedCity);
  if (country) return { country, city };

  const parts = aiText(rawLocation)
    .replace(/\([^)]*\)/g, " ")
    .split(/[،,/]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  // "Nazareth, Israel" — the last part names a country we recognise.
  const last = parts[parts.length - 1] || "";
  if (parts.length > 1) {
    return {
      country: cleanCountryPrefill(last, uiLang),
      city: city || parts.slice(0, -1).join(", "),
    };
  }

  // A single token that IS the country (e.g. "Israel") still resolves.
  const asCountry = cleanCountryPrefill(last, uiLang);
  if (asCountry && /إسرائيل|israel|ישראל/i.test(last)) return { country: asCountry, city };

  return { country: cleanCountryPrefill(ipCountry, uiLang), city: city || last };
}

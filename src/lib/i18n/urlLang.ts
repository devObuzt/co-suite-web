/**
 * `?lang=ar` بالرابط ← رمز لغة مدعوم، أو null.
 *
 * ليش: اللغة بتنقرا من localStorage والافتراضي إنجليزي، فرابط الواتساب ما
 * كان عنده طريقة يفتح القمع بلغة الزبون. نقيّة — بتنفحص بـ `node --test`.
 */
export function langFromSearch<T extends string>(search: string, supported: readonly T[]): T | null {
  const raw = new URLSearchParams(search).get("lang");
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return (supported as readonly string[]).includes(code) ? (code as T) : null;
}

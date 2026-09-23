// تستات بلا أي حزمة: Node بيقرا TypeScript لحاله (type stripping).
//   node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARAB_48_DIALECT,
  arab48Eligible,
  splitLocationPrefill,
  suggestedDialect,
} from "../src/lib/suite/audiencePrefill.ts";

// ── the dialect label ───────────────────────────────────────────────────────

test("عرب الـ48 بدها التلاتة: واجهة عربي + جمهور عربي + إسرائيل", () => {
  assert.equal(arab48Eligible("ar", ["ar"], "إسرائيل"), true);
  assert.equal(arab48Eligible("he", ["ar"], "إسرائيل"), false, "واجهة عبري");
  assert.equal(arab48Eligible("ar", ["he"], "إسرائيل"), false, "جمهور عبري");
  assert.equal(arab48Eligible("ar", ["ar"], "Brazil"), false, "برا إسرائيل");
});

test("وصف لهجة فيه كلمة «عرب» ما بكفي يفرض الليبل", () => {
  // هاد اللي كسر: سويت عبري طلعله «عربي - عرب الـ48».
  const extracted = "עברית + ערבית פלסטינית מעורבת";
  assert.equal(suggestedDialect(extracted, ["he"], "ישראל", "he"), extracted);
});

test("ليبل قديم عالق بينمسح لما السويت ما بتستاهله", () => {
  assert.equal(suggestedDialect(ARAB_48_DIALECT, ["he"], "ישראל", "he"), "");
});

test("السويت المستاهلة بتاخد الليبل بالضبط", () => {
  assert.equal(suggestedDialect("أي إشي", ["ar"], "إسرائيل", "ar"), ARAB_48_DIALECT);
});

// ── the country / city split ────────────────────────────────────────────────

const IL_HE = "ישראל";

test("بلدة لحالها بتروح للمدن مش للدولة", () => {
  // هاد اللي كسر: «ירכא» انحطّت كدولة استهداف.
  const out = splitLocationPrefill("", "", "ירכא", "Israel", "he");
  assert.equal(out.city, "ירכא");
  assert.equal(out.country, IL_HE);
});

test("«مدينة، دولة» بتنفرق صح", () => {
  const out = splitLocationPrefill("", "", "Nazareth, Israel", "", "he");
  assert.equal(out.city, "Nazareth");
  assert.equal(out.country, IL_HE);
});

test("دولة لحالها بتضل دولة", () => {
  const out = splitLocationPrefill("", "", "Israel", "", "en");
  assert.equal(out.country, "Israel");
  assert.equal(out.city, "");
});

test("الحقول المفصولة من الـAI بتسبق النص الحر", () => {
  const out = splitLocationPrefill("Israel", "Yarka", "whatever, nonsense", "Brazil", "en");
  assert.equal(out.country, "Israel");
  assert.equal(out.city, "Yarka");
});

test("كلمة «null» من النموذج بتتعامل كفاضي", () => {
  const out = splitLocationPrefill("null", "null", "ירכא", "Israel", "he");
  assert.equal(out.city, "ירכא");
  assert.equal(out.country, IL_HE);
});

test("فلسطين بتنكتب إسرائيل — قرار مالك", () => {
  assert.equal(splitLocationPrefill("فلسطين", "", "", "", "ar").country, "إسرائيل");
});

test("بلا دولة مستخرجة وبلا IP: الدولة بتضل فاضية بدل ما تتخمّن", () => {
  const out = splitLocationPrefill("", "", "ירכא", "", "he");
  assert.equal(out.country, "");
  assert.equal(out.city, "ירכא");
});

test("ملاحظات الـAI بين قوسين بتنشال من الدولة", () => {
  assert.equal(splitLocationPrefill("Israel (north)", "", "", "", "en").country, "Israel");
});

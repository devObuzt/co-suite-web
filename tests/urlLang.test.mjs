// تستات بلا أي حزمة: Node 23 بيقرا TypeScript لحاله (type stripping).
//   node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { langFromSearch } from "../src/lib/i18n/urlLang.ts";

const SUPPORTED = ["en", "ar", "he"];

test("?lang=ar بيرجّع ar", () => {
  assert.equal(langFromSearch("?lang=ar", SUPPORTED), "ar");
});

test("حروف كبيرة ومسافات بتتطبّع", () => {
  assert.equal(langFromSearch("?lang=%20AR%20", SUPPORTED), "ar");
});

test("بين بارامترات تانية (utm من الواتساب)", () => {
  assert.equal(langFromSearch("?utm_source=wa&lang=he", SUPPORTED), "he");
});

test("لغة مش مدعومة = null", () => {
  assert.equal(langFromSearch("?lang=xx", SUPPORTED), null);
});

test("بلا بارامتر = null", () => {
  assert.equal(langFromSearch("", SUPPORTED), null);
});

test("بارامتر فاضي = null", () => {
  assert.equal(langFromSearch("?lang=", SUPPORTED), null);
});

// تستات بلا أي حزمة.
//   node --test tests/
//
// ⚠️ هاد الفحص **ما بيستورد أي ملف .ts** بالمقصود — بيقرا الملفات كنصّ.
//    Railway بتبني على Node 20 اللي ما بيقرا TypeScript، فأي فحص بيستورد
//    .ts بيسقط عندها وبيكسر النشر. لهيك هاد لحاله هو اللي مربوط بـprebuild.
//
// A user who picked Hebrew must never be shown Arabic, and the reverse. On
// 2026-09-23 step 3 of the funnel (خطة العمل) was written in Arabic only, so a
// Hebrew visitor read Arabic headings inside their own journey.
//
// This is a RATCHET, not a clean-room check. Every file that still holds
// hard-coded Arabic/Hebrew is listed below with its exact character budget:
//   • a new file with such text            → fails
//   • an existing file going over budget   → fails
//   • a file going under budget            → fails, telling you to lower it
// so cleaning up debt is recorded and backsliding is impossible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const ARABIC = /[؀-ۿ]/g;
const HEBREW = /[֐-׿]/g;

/** Files whose non-UI-language text is the point, not a leak. */
const ALLOWED = new Set([
  // Translation tables — every language by definition.
  "src/lib/i18n/translations.ts",
  "src/lib/i18n/suggestions.ts",
  "src/lib/i18n/workPlans.ts",
  "src/lib/i18n/adminTextCatalog.ts",
  // Legal copy, structured per language.
  "src/lib/legal/policies.ts",
  // Prompt text sent to the model, not shown as UI.
  "src/lib/admin/promptCatalog.ts",
  // One client's own business-card content (Hebrew law office).
  "src/lib/ex/bc/cards.ts",
  "src/components/ex/bc/BusinessCard.tsx",
]);

/**
 * Character budgets for files that still carry hard-coded UI text, whether in
 * one language (a real leak, still to be migrated) or in their own per-language
 * label map (fine, but pinned so it cannot grow a stray literal unnoticed).
 * Lower a number when you migrate a file; delete the entry when it hits zero.
 */
const BUDGET = {
  // 🔴 single-language leaks — still to migrate
  "src/app/(dashboard)/suite/[id]/video-montage/page.tsx": [2834, 0],
  "src/app/link-suite/page.tsx": [418, 0],
  "src/app/(dashboard)/suite/[id]/media/page.tsx": [199, 0],
  "src/app/(dashboard)/suites/page.tsx": [172, 0],
  "src/app/(dashboard)/admin/languages/page.tsx": [120, 0],
  "src/lib/api.ts": [112, 0],
  "src/app/(dashboard)/admin/page.tsx": [31, 0],
  "src/app/(dashboard)/suite/[id]/market/page.tsx": [15, 0],
  "src/app/(dashboard)/admin/prompts/page.tsx": [14, 0],
  "src/remotion/AiMontage.tsx": [1, 0],

  // ✅ components carrying their own complete per-language label maps
  "src/components/marketing-plan/MarketingPlanStages.tsx": [2123, 1906],
  "src/app/(dashboard)/suite/new/page.tsx": [1004, 984],
  "src/app/(dashboard)/suite/[id]/page.tsx": [598, 486],
  "src/app/page.tsx": [547, 517],
  "src/components/marketing-plan/MarketingPlanView.tsx": [385, 339],
  "src/app/(dashboard)/suite/[id]/profile/page.tsx": [248, 209],
  "src/app/startbyconnec/services/page.tsx": [166, 161],
  "src/app/(dashboard)/suite/[id]/marketing-plan/[stage]/page.tsx": [81, 61],
  "src/app/(dashboard)/create/page.tsx": [70, 70],
  "src/app/(dashboard)/admin/packages/page.tsx": [93, 36],
  "src/lib/suite/audiencePrefill.ts": [54, 20],
  "src/components/FirstTimeLanguagePicker.tsx": [14, 16],
  "src/app/(dashboard)/admin/services/page.tsx": [8, 13],
  "src/app/(dashboard)/suite/[id]/marketing-plan/page.tsx": [12, 8],
  "src/components/suite/SuiteLegacyDashboard.tsx": [7, 5],
  "src/remotion/classic/ClassicScene.tsx": [2, 2],
};
/** Comments are written in Arabic in this codebase; only shipped text counts. */
function stripComments(source) {
  let out = "";
  for (let i = 0; i < source.length; ) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === c) break;
        j += 1;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (source.startsWith("//", i)) {
      const j = source.indexOf("\n", i);
      i = j < 0 ? source.length : j;
      continue;
    }
    if (source.startsWith("/*", i)) {
      const j = source.indexOf("*/", i);
      const end = j < 0 ? source.length : j + 2;
      out += source.slice(i, end).replace(/[^\n]/g, " ");
      i = end;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules") walk(full, files);
    } else if (/\.tsx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function scan() {
  const found = {};
  for (const file of walk(SRC)) {
    const key = relative(ROOT, file).split(sep).join("/");
    if (ALLOWED.has(key)) continue;
    const code = stripComments(readFileSync(file, "utf8"));
    const ar = (code.match(ARABIC) || []).length;
    const he = (code.match(HEBREW) || []).length;
    if (ar || he) found[key] = [ar, he];
  }
  return found;
}

test("no file gains hard-coded Arabic or Hebrew UI text", () => {
  const found = scan();
  const unlisted = Object.keys(found).filter((f) => !(f in BUDGET));
  assert.deepEqual(
    unlisted,
    [],
    `these files carry Arabic/Hebrew text that is not in the i18n system:\n` +
      unlisted.map((f) => `  ${f} → ar:${found[f][0]} he:${found[f][1]}`).join("\n") +
      `\n\nMove the strings into a per-language label map (see src/lib/i18n/workPlans.ts).` +
      ` A user who picked one language must never be shown another.`,
  );
});

test("no listed file grows more hard-coded text", () => {
  const found = scan();
  const grown = [];
  for (const [file, [ar, he]] of Object.entries(BUDGET)) {
    const actual = found[file] || [0, 0];
    if (actual[0] > ar || actual[1] > he) {
      grown.push(`  ${file}: budget ar:${ar} he:${he} → now ar:${actual[0]} he:${actual[1]}`);
    }
  }
  assert.deepEqual(grown, [], `hard-coded text grew in:\n${grown.join("\n")}`);
});

test("the debt list matches reality — lower a budget when you migrate a file", () => {
  const found = scan();
  const stale = [];
  for (const [file, [ar, he]] of Object.entries(BUDGET)) {
    const actual = found[file] || [0, 0];
    if (actual[0] < ar || actual[1] < he) {
      stale.push(`  ${file}: budget ar:${ar} he:${he} → now ar:${actual[0]} he:${actual[1]}`);
    }
  }
  assert.deepEqual(
    stale,
    [],
    `these files hold LESS hard-coded text than the budget says — good, now lower it in ` +
      `tests/languageLeak.test.mjs so the gain is locked in:\n${stale.join("\n")}`,
  );
});

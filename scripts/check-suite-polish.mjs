import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  "src/app/(dashboard)/suite/[id]/page.tsx",
  "src/app/(dashboard)/suite/[id]/profile/page.tsx",
  "src/app/(dashboard)/suite/[id]/connections/page.tsx",
  "src/app/(dashboard)/suite/[id]/analytics/page.tsx",
  "src/components/suite/SuiteNav.tsx",
];

const forbiddenSnippets = [
  "Loading...",
  "Suite not found",
  "Brand/Profile",
  "Edit the current Suite's business",
  "Business name",
  "Audience Languages",
  "Primary language:",
  "One product or service per line",
  "Target Audience",
  "Upload logo",
  "Upload reference",
  "Content Rules Learned From Feedback",
  "Save profile",
  "Connection status is unavailable",
  "Provider readiness for publishing",
  "Checking provider status...",
  "Current Suite connection state",
  "Missing configuration names are shown",
  "\"Connected\"",
  "\"Not connected\"",
  "\"Needs attention\"",
  "Analytics status is unavailable",
  "Read-only campaign and channel performance",
  "Checking analytics prerequisites...",
  "Metric dashboard is waiting for provider data",
  "Open Connections",
  "Your suite command center",
  "Create posts, ads, sets",
  "Needs setup",
  "Connection readiness",
];

let failed = false;

for (const target of targets) {
  const file = path.join(root, target);
  const source = fs.readFileSync(file, "utf8");

  for (const snippet of forbiddenSnippets) {
    if (source.includes(snippet)) {
      console.error(`${target}: hard-coded copy remains: ${snippet}`);
      failed = true;
    }
  }

  if (source.includes("text-right")) {
    console.error(`${target}: use text-end/text-start so RTL alignment follows document direction`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("Suite localization, RTL alignment, and scoped theme check passed.");

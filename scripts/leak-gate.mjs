#!/usr/bin/env node
// Leak gate: fail the build if internal details appear in the site or its
// sources. The repository is public, so this file holds only GENERIC patterns.
// Specific values (names, addresses) come from the LEAK_DENYLIST environment
// variable (a CI secret): one regular expression per line.
//
//   node scripts/leak-gate.mjs dist src
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const TEXT = new Set([".html", ".css", ".js", ".mjs", ".ts", ".astro", ".md", ".xml", ".txt", ".json", ".svg"]);
const SKIP = new Set(["node_modules", ".astro", ".tools"]);
const SELF = "scripts/leak-gate.mjs";

const generic = [
  ["IPv4 address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ["host on ctronixtech.com other than www", /\b(?!www\.)[a-z0-9-]+\.ctronixtech\.com\b/i],
  ["e-mail address outside ctronixtech.com", /\b[A-Za-z0-9._%+-]+@(?!ctronixtech\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ["GUID (subscription, tenant or object ID)", /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ["key-like base64 (WireGuard and similar)", /\b[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=(?![A-Za-z0-9+/=])/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Azure resource hostname", /\.(?:vault\.azure\.net|blob\.core\.windows\.net|azurecomm\.net)\b/i],
  ["router DDNS name", /\.sn\.mynetname\.net\b/i],
];
const extra = (process.env.LEAK_DENYLIST || "")
  .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  .map((l, i) => [`private pattern #${i + 1}`, new RegExp(l, "i")]);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (TEXT.has(extname(name))) yield p;
  }
}

const roots = process.argv.slice(2);
if (roots.length === 0) { console.error("usage: leak-gate.mjs <dir>..."); process.exit(2); }
let findings = 0, scanned = 0;
for (const root of roots) {
  for (const f of files(root)) {
    if (relative(process.cwd(), f) === SELF) continue;
    scanned++;
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, n) => {
      for (const [label, re] of [...generic, ...extra]) {
        if (re.test(line)) {
          findings++;
          // Never echo the matched text: it may be the very secret.
          console.error(`LEAK  ${f}:${n + 1}  ${label}`);
        }
      }
    });
  }
}
console.log(`leak-gate: ${scanned} files, ${extra.length} private patterns, ${findings} finding(s)`);
process.exit(findings ? 1 : 0);

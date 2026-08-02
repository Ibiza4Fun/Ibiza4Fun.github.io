#!/usr/bin/env node
/**
 * Imports an existing HTML page into flater/ and makes it belong here.
 *
 * The two sources that actually occur:
 *
 *   a saved claude.ai artifact  carries a host wrapper - an injected
 *                               frame-runtime script and a host <head> - none
 *                               of which belongs on a standalone site
 *   a hand-written page         starts at <title> with no wrapper at all
 *
 * Both are handled: everything before the page's own <title> is dropped, a
 * proper head is written, a way back to the index is inserted, and the result
 * is scanned before it can become public.
 *
 * Usage:
 *   node tools/import.mjs <source> <slug> <kind> [date] [--force] [--accept-flagged]
 *
 *   slug   file name without .html, ASCII and English - it becomes the URL
 *   kind   guide | mockup | test | verktoy | skisse | rapport
 *   date   YYYY-MM-DD, defaults to the source file's last modified date
 *
 * Exits non-zero when the scan flags something. That is the point: this
 * repository is public, and a scan that cannot stop the import proves nothing.
 * Pass --accept-flagged once a human has looked at what it found and decided.
 */

import { readFile, writeFile, stat, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KINDS = ["guide", "mockup", "test", "verktoy", "skisse", "rapport"];

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const [source, slug, kind, dateArg] = argv.filter((a) => !a.startsWith("--"));

function usage(message) {
  console.error(message);
  console.error("\nUsage: node tools/import.mjs <source> <slug> <kind> [date] [--force] [--accept-flagged]");
  console.error(`Kinds: ${KINDS.join(", ")}`);
  process.exit(1);
}

if (!source || !slug || !kind) usage("Missing argument.");
if (!KINDS.includes(kind)) usage(`Unknown kind "${kind}".`);
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  usage(`Slug "${slug}" must be lowercase ASCII, digits and hyphens - it becomes the URL.`);
}
if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) usage(`Date "${dateArg}" is not YYYY-MM-DD.`);

const destination = path.join(ROOT, "flater", `${slug}.html`);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if ((await exists(destination)) && !flags.has("--force")) {
  console.error(`flater/${slug}.html already exists. Pass --force to replace it.`);
  process.exit(1);
}

const raw = await readFile(source, "utf8");

const titleStart = raw.indexOf("<title>");
if (titleStart === -1) {
  console.error("No <title> in the source. Refusing to guess what this page is called.");
  process.exit(1);
}

// A saved artifact ends with </body>; a hand-written fragment simply runs to
// the end of the file.
const closing = raw.lastIndexOf("</body>");
let content = raw.slice(titleStart, closing === -1 ? raw.length : closing).trim();

const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
const title = titleMatch ? titleMatch[1].trim() : "";
if (!title) {
  console.error("Empty <title>. Refusing to write a page the index cannot name.");
  process.exit(1);
}

// The title moves into the head built below; drop it from the body copy.
content = content.replace(/<title>[\s\S]*?<\/title>/i, "").trim();

const date = dateArg || (await stat(source)).mtime.toISOString().slice(0, 10);

// A way back to the index. Someone arriving from a shared link has no other
// route to the rest of the site.
const backLink =
  '<a href="/" style="display:inline-block;margin:0 0 18px;font:600 12px/1 ui-monospace,monospace;' +
  'letter-spacing:.06em;color:currentColor;opacity:.55;text-decoration:none">&larr; ALLE FLATER</a>';

const wrapOpen = content.indexOf('<div class="wrap">');
if (wrapOpen !== -1) {
  const at = wrapOpen + '<div class="wrap">'.length;
  content = content.slice(0, at) + "\n\n" + backLink + "\n" + content.slice(at);
} else {
  content = backLink + "\n" + content;
}

const escaped = title
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const page = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped}</title>
<meta name="theme-color" content="#0A0C10">

<meta name="flate:kind" content="${kind}">
<meta name="flate:date" content="${date}">

<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
</head>
<body>

${content}

<script src="/assets/js/offline.js" defer></script>
</body>
</html>
`;

// Scan before writing, not after. A page that fails the scan should never exist
// on disk for someone to commit by accident.
const patterns = [
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "IP address"],
  [/\b(?:\+47\s?)?(?:\d{2}\s?){4}\b/g, "possible phone number"],
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "email address"],
  [/\b(?:token|secret|password|passord|api[_-]?key|bearer)\b/gi, "credential word"],
  [/\b\d{1,2}\.\d{4,6},\s?\d{1,2}\.\d{4,6}\b/g, "possible coordinates"],
  [/C:\\Users\\[^\s"'<>]+/g, "local file path"],
  [/https?:\/\/claude\.ai[^\s"'<>]*/g, "claude.ai link (needs login, dead for others)"],
];

let flagged = 0;
for (const [re, label] of patterns) {
  const hits = [...new Set(content.match(re) || [])];
  if (hits.length > 0) {
    flagged += hits.length;
    console.log(`  ${label}: ${hits.slice(0, 8).join(", ")}${hits.length > 8 ? " ..." : ""}`);
  }
}

if (flagged > 0 && !flags.has("--accept-flagged")) {
  console.error(`\nRefused: ${flagged} item(s) above need a human decision before this goes public.`);
  console.error("Remove them from the source, or re-run with --accept-flagged once you have looked.");
  process.exit(1);
}

await writeFile(destination, page, "utf8");

console.log(`Wrote flater/${slug}.html`);
console.log(`Title: ${title}`);
console.log(`Kind:  ${kind}   Date: ${date}`);
console.log(flagged === 0 ? "Scan:  nothing flagged." : `Scan:  ${flagged} item(s) accepted by hand.`);
console.log("\nNext: npm run build, then commit and push.");

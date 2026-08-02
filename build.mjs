#!/usr/bin/env node
/**
 * Builds index.html, sitemap.xml and sw.js from the pages in flater/.
 *
 * Zero dependencies on purpose: only Node built-ins. A build step that needs an
 * npm install is a build step that breaks the first time a lockfile drifts.
 *
 *   node build.mjs            write index.html, sitemap.xml, sw.js
 *   node build.mjs --check    validate only, write nothing, exit 1 on any problem
 *
 * The check is the point. It refuses a page with no title, an unknown kind, a
 * malformed date, a guide with no steps, or an internal link that does not
 * resolve on disk. A check that cannot fail proves nothing.
 */

import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.join(ROOT, "flater");
const TEMPLATE_DIR = path.join(ROOT, "templates");
const SITE_URL = "https://ibiza4fun.github.io";

const KINDS = ["guide", "mockup", "test", "verktoy", "skisse", "rapport"];

/** Norwegian labels for the filter chips. File names and code stay English. */
const KIND_LABEL = {
  guide: "Guide",
  mockup: "Mockup",
  test: "Test",
  verktoy: "Verktøy",
  skisse: "Skisse",
  rapport: "Rapport",
};

const CHECK_ONLY = process.argv.includes("--check");
const problems = [];

function fail(file, message) {
  problems.push(`${file}: ${message}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaContent(html, name) {
  const re = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(re);
  return match ? match[1].trim() : null;
}

/** Last commit date for a file, so a page without an explicit date still sorts. */
function gitDate(relPath) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", relPath], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

/** A short stable code shown on the card, derived from the title. Matches art.js. */
function seedCode(title) {
  let h = 2166136261;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().slice(0, 4).padStart(4, "0");
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Every root-absolute href/src in a page must resolve to a file in this tree. */
async function checkInternalLinks(html, file) {
  const refs = [...html.matchAll(/(?:href|src)=["'](\/[^"'#?]*)["']/g)].map((m) => m[1]);
  for (const ref of new Set(refs)) {
    const target = path.join(ROOT, ref.replace(/^\//, ""));
    if (!(await exists(target))) {
      fail(file, `link does not resolve on disk: ${ref}`);
    }
  }
}

async function readPages() {
  let names;
  try {
    names = (await readdir(PAGES_DIR)).filter((n) => n.endsWith(".html")).sort();
  } catch {
    console.error(`No flater/ directory at ${PAGES_DIR}`);
    process.exit(1);
  }

  const pages = [];

  for (const name of names) {
    const file = path.join("flater", name);
    const html = await readFile(path.join(PAGES_DIR, name), "utf8");

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    if (!title) fail(file, "no <title>");

    const kind = metaContent(html, "flate:kind");
    if (!kind) fail(file, 'no <meta name="flate:kind">');
    else if (!KINDS.includes(kind)) {
      fail(file, `unknown kind "${kind}" (allowed: ${KINDS.join(", ")})`);
    }

    let date = metaContent(html, "flate:date");
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fail(file, `date "${date}" is not YYYY-MM-DD`);
      date = null;
    }
    if (!date) date = gitDate(file);
    if (!date) fail(file, "no flate:date and no git history to fall back on");

    const temporary = metaContent(html, "flate:temporary") === "true";
    // Any element carrying class="step" counts. Guides written before this site
    // existed use their own markup, and the rule is about having steps at all -
    // not about matching the template in templates/.
    const steps = (html.match(/class=["']step["']/g) || []).length;
    if (kind === "guide" && steps === 0) {
      fail(file, 'kind is guide but nothing carries class="step"');
    }

    await checkInternalLinks(html, file);

    pages.push({
      href: `/flater/${name}`,
      title: title || name,
      kind: kind || "skisse",
      date: date || "0000-00-00",
      temporary,
      steps,
    });
  }

  pages.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title, "nb")));
  return pages;
}

function renderCard(page) {
  const flags = [];
  if (page.kind === "guide" && page.steps > 0) {
    flags.push(`<span class="flag guide">${page.steps} steg</span>`);
  }
  if (page.temporary) {
    flags.push('<span class="flag temp">midlertidig</span>');
  }

  return `      <li class="item" data-kind="${escapeHtml(page.kind)}">
        <a class="card" href="${escapeHtml(page.href)}">
          <div class="thumb">
            <canvas data-seed="${escapeHtml(page.title)}" aria-hidden="true"></canvas>
            <span class="seed">#${seedCode(page.title)}</span>
            ${flags.join("\n            ")}
          </div>
          <div class="cbody">
            <h2 class="ctitle">${escapeHtml(page.title)}</h2>
            <div class="cmeta">
              <span class="kind">${escapeHtml(KIND_LABEL[page.kind] || page.kind)}</span>
              <span class="date">${escapeHtml(page.date)}</span>
            </div>
          </div>
        </a>
      </li>`;
}

function renderChips(pages) {
  const present = KINDS.filter((k) => pages.some((p) => p.kind === k));
  const chips = [
    '<button class="chip" type="button" data-kind="alle" aria-pressed="true">Alle</button>',
    ...present.map(
      (k) =>
        `<button class="chip" type="button" data-kind="${k}" aria-pressed="false">${KIND_LABEL[k]}</button>`
    ),
  ];
  return chips.map((c) => `    ${c}`).join("\n");
}

function renderSitemap(pages, today) {
  const urls = [
    `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod></url>`,
    ...pages.map(
      (p) => `  <url><loc>${SITE_URL}${p.href}</loc><lastmod>${p.date}</lastmod></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

async function main() {
  const pages = await readPages();

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("");
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log(`OK: ${pages.length} page(s), no problems.`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const guides = pages.filter((p) => p.kind === "guide").length;

  const template = await readFile(path.join(TEMPLATE_DIR, "index.html"), "utf8");
  const index = template
    .replace("{{CHIPS}}", renderChips(pages))
    .replace("{{CARDS}}", pages.map(renderCard).join("\n"))
    .replace(/\{\{TOTAL\}\}/g, String(pages.length))
    .replace("{{GUIDES}}", String(guides))
    .replace("{{BUILT}}", today);
  await writeFile(path.join(ROOT, "index.html"), index, "utf8");

  await writeFile(path.join(ROOT, "sitemap.xml"), renderSitemap(pages, today), "utf8");

  // The cache name carries the build stamp, so a deploy retires the old cache
  // instead of serving yesterday's guide from a phone that never reloaded.
  const swTemplate = await readFile(path.join(TEMPLATE_DIR, "sw.js"), "utf8");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const precache = ["/", "/assets/css/site.css", "/assets/css/guide.css", "/assets/icons/favicon.svg"];
  const sw = swTemplate
    .replace("{{VERSION}}", stamp)
    .replace("{{PRECACHE}}", JSON.stringify(precache, null, 2));
  await writeFile(path.join(ROOT, "sw.js"), sw, "utf8");

  console.log(`Built index.html with ${pages.length} page(s), ${guides} guide(s).`);
  console.log(`Wrote sitemap.xml and sw.js (cache ${stamp}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

# ibiza4fun.github.io

A public, static site. It is a sibling of the Øyna repositories under
`C:\Users\bardb\repos`, so the workspace root `CLAUDE.md` and the unscoped rules in
`.claude/rules/` load on top of this file.

**This file is the standing instruction for the site.** It exists so Bård never has to
re-explain what this place is for, what was already decided, or how to publish. If
something here is stale, fix it here - do not carry the correction in a conversation.

---

## What this site is for

His words, 2026-08-02, and they settle the shape:

> a place where I can make things available - to show others, or to reach content
> from outside, for example on the phone when I am on the move
>
> maybe make some guides, like today when I had to go down to the boat and needed
> step-by-step instructions

So: **things built locally, published so they can be reached from anywhere.** Guides
read in the field are the sharpest case and the reason several decisions below went the
way they did. The boat's own field checklist says `Z:` is unreachable at the dock -
this site is the answer to that.

## Decided already. Do not re-open without being asked.

Each of these was proposed and rejected, or chosen deliberately. Raising them again
costs him time he already spent.

| decision | why |
|---|---|
| **No blog** | He said so plainly. Ad-hoc pages, not posts. |
| **Nothing personal** | No profile photo, no name in the header, no "about me", no introduction. The site is not about him. |
| **No Om meg / Kontakt / Prosjekter pages** | Four pages that would all stand empty. There is one page and a folder of surfaces. |
| **No description under a title on the index** | This is what made an earlier draft read as a blog. A title that needs explaining is a title to rewrite. |
| **A grid of cards, not a dated register** | The register form was tried and read as a blog too. |
| **Card artwork is computed, never stored** | "A card with an image" means finding an image per page, every time. That is the one requirement that would have stopped this in practice. The title hashes to a seed; the seed picks hue and pattern. |
| **Dark by default, light follows the reader's setting** | No toggle. A toggle costs JS, storage and a flash on load. |
| **Offline cache** | A guide is read outdoors with one bar of signal, which is exactly when a network fetch fails. |
| **Generated files are git-ignored** | `index.html`, `sitemap.xml`, `sw.js`. CI rebuilds them, so the published site cannot drift from `flater/`. |

## Language

The workspace rule holds for code, comments, commit messages, file names and this
documentation: **English**.

The exception is wider here than elsewhere. **Everything the reader sees is Norwegian** -
titles, guide steps, page copy, the front page. That is product text. Bokmål, and æøå
written as themselves.

File names and slugs stay English and ASCII, because a file name becomes a URL.

## This repository is public. The others are not.

Everything committed here is world-readable the moment it is pushed, and published is
published even after a delete. `tools/import.mjs` scans for IP addresses, phone numbers,
email addresses, credential words, coordinates, local `C:\Users\...` paths and
claude.ai links, and **refuses the import** when it finds any. `--accept-flagged`
overrides it, and is only for after a human has read what it found.

The scan is not a substitute for reading the page. Before anything from `oyna-*` or
`lillehagveien-*` goes in, read it whole - not the top - and look for member names,
addresses, entity IDs, and internal detail that explains how an alarm or a lock can be
defeated. When in doubt it does not go in; it stays where it already lives.

---

## Publishing, start to finish

**What he gives:** what he wants out, roughly. Often a link, a file path, or just a name.

**What is decided without asking:** the slug, the date, the kind, and the commit message.

### 1. Find the source

| where it lives | how to get it |
|---|---|
| a claude.ai artifact | `Artifact` tool with `action: "list"` to find the URL, then `WebFetch` on it. Artifact URLs are fetchable with his login; `curl` is not - it gets the SPA shell or a 403. WebFetch saves the full HTML to a file and prints the path. Use that file. |
| boat and engine material | `Z:\Misc\Båt\Ibiza 24\Suzuki SDS\AI Data\` - reports, field procedures, the SDS tooling and the raw logs |
| anywhere on disk | just the path |

If the artifact list does not show it, say so and ask - do not guess which one he means.
An empty search result is not a zero; name what was searched.

### 2. Import

```
node tools/import.mjs <source> <slug> <kind> [date] [--force] [--accept-flagged]
```

Strips the claude.ai host wrapper, writes a proper head with the `flate:` meta tags,
inserts a link back to the index, and scans. Kinds: `guide`, `mockup`, `test`,
`verktoy`, `skisse`, `rapport`.

A hand-written page can also just be dropped in `flater/` with `<title>` and:

```html
<meta name="flate:kind" content="guide">
<meta name="flate:date" content="2026-08-02">
<meta name="flate:temporary" content="true">   <!-- optional: marked for deletion -->
```

### 3. Build, commit, push

```
npm run check
npm run build
git add -A && git commit && git push
```

There is no index to edit. `build.mjs` reads `flater/` and writes the front page, so a
page that exists is a page that is listed. Removing a page is deleting the file.

### 4. Verify, and mean it

Green is not the same as correct. Do all four:

1. `npm run check` passes - and has been shown to fail on a bad page. It refuses a
   missing title, an unknown kind, a malformed date, a guide with nothing carrying
   `class="step"`, and a root-absolute link that does not resolve on disk.
2. The deploy run is green (`gh run watch <id> --exit-status`).
3. Every published path returns 200 - the new page, and the assets.
4. A path that does not exist returns 404. A check that cannot fail proves nothing.

Note for PowerShell: `Invoke-WebRequest` needs `-UseBasicParsing` here, or it dies on an
interactive first-run prompt and reports an error that has nothing to do with the site.

---

## Structure

```
flater/                 one self-contained page per file - this is the content
templates/index.html    front page skeleton, filled in by the build
templates/sw.js         offline cache, stamped with a version by the build
assets/css              site.css (tokens + index), guide.css (guide pages)
assets/js               art.js, index.js, guide.js, offline.js
tools/import.mjs        bring an existing page in, and scan it
build.mjs               generates index.html, sitemap.xml, sw.js - and validates
```

Guides use `templates`-style markup: `<button class="step">` inside `<ol class="steps">`,
with `#fill`, `#pdone`, `#ptotal` and `#reset` in the header for progress. A guide
written elsewhere keeps its own markup - the build only requires that something carries
`class="step"`.

## Carried-forward gaps

Do not rediscover these. Fix them or leave them, but say which.

- **No `og:image`.** Title, description and URL are set; there is no image file to point
  at, and a tag pointing at nothing is worse than no tag. Needs a 1200x630 PNG.
- **No local `check-language` hook**, unlike every other repository here. `check-secrets`
  is now wired (see below); nothing yet checks that reader-facing text is Norwegian and
  everything else is English.

- **`core.hooksPath` is local config, so a fresh clone is unguarded.** gitleaks and the
  hook were installed 2026-08-17, but `git config core.hooksPath tools/githooks` lives in
  `.git/config` and does not travel with the repository. After cloning, run it - and
  `winget install --id Gitleaks.Gitleaks` - before the first commit. `tools/check-secrets.sh`
  refuses when the scanner is missing, so an unguarded clone fails closed rather than
  silently passing.

  When proving the hook works, do not probe it with AWS's documentation example key: it
  sits on the scanner's allowlist, the scan returns clean, and the test measures nothing.
  `tools/check-secrets.sh` says so in its own comments and it is still an easy trap to
  walk into. Use a different key shape, and assemble it at run time so no complete
  pattern is ever written to a file.
- **`flater/example-guide.html`** is the template, marked `temporary`. Delete it once a
  second real guide exists.

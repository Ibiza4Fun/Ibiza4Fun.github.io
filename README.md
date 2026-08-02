# ibiza4fun.github.io

Static surfaces built locally and published so they can be reached from anywhere -
guides read in the field, mockups, tests, reports. Phone first: guides work without
coverage once opened, and can be added to the home screen.

No framework, no runtime dependencies, no tracking. Plain HTML, CSS and JavaScript,
plus a Node build step that uses only built-ins.

## Layout

```
flater/                 one self-contained page per file - this is the content
templates/index.html    the front page skeleton, filled in by the build
templates/sw.js         the offline cache, stamped with a version by the build
assets/css              site.css (tokens + index), guide.css (guide pages)
assets/js               art.js, index.js, guide.js, offline.js
build.mjs               generates index.html, sitemap.xml and sw.js
index.html              GENERATED - not in git, rebuilt in CI
sitemap.xml  sw.js      GENERATED - not in git, rebuilt in CI
```

The three generated files are git-ignored on purpose. CI builds them from source on
every deploy, so the published site cannot drift from `flater/`. Run `npm run build`
locally when you want to preview.

## Adding a page

1. Put a self-contained `.html` file in `flater/`. Anything works: an exported
   artifact, a report, a mockup.
2. Give it a `<title>` and these two meta tags in the head:

   ```html
   <meta name="flate:kind" content="guide">
   <meta name="flate:date" content="2026-08-02">
   ```

   `kind` is one of `guide`, `mockup`, `test`, `verktoy`, `skisse`, `rapport`.
   `date` is optional - without it the build falls back to the file's last commit
   date. Add `<meta name="flate:temporary" content="true">` to mark a page you
   intend to delete again.

3. `npm run build`
4. Commit and push. The site is live about half a minute later.

There is no index to edit. `build.mjs` reads the files in `flater/` and writes
`index.html`, so a page that exists is a page that is listed.

Removing a page is deleting the file and pushing.

### File names are English, page content is Norwegian

Deliberate. The file name becomes the URL, and `æøå` in a URL survives no round trip
worth relying on. The title and everything the reader sees is Norwegian.

## Adding a guide

Copy `flater/example-guide.html`, change the title and the steps. The guide chrome -
sticky header, progress bar, tick-off that is remembered per page - comes from
`assets/css/guide.css` and `assets/js/guide.js`. A guide needs at least one
`<button class="step">`; the build refuses one with none.

Guides are the reason the offline cache exists. A guide is read standing outside with
one bar of signal, and that is exactly when a network fetch fails.

## Checking

```
npm run check
```

Validates without writing anything, and exits non-zero on:

- a page with no `<title>`
- a missing or unknown `flate:kind`
- a `flate:date` that is not `YYYY-MM-DD`, with no git date to fall back on
- a page marked `guide` with no steps
- a root-absolute `href`/`src` that does not resolve to a file in this tree

The same check runs in CI before every deploy, so a broken link fails the deploy
rather than shipping quietly. It is meant to be able to say no - point it at a page
with a bad link and confirm it refuses.

## Local preview

```
npm run serve
```

Serves the tree at `http://localhost:3000`. Needed rather than opening `index.html`
from disk, because every internal path is root-absolute and the service worker only
registers on a real origin.

## How publishing works

`.github/workflows/deploy.yml` runs on every push to `main`: validate, build, upload
the whole tree, deploy. The Pages source is **GitHub Actions**, not "deploy from a
branch" - set once under Settings - Pages, and already set if this repository was
created by the setup that wrote this file.

`.nojekyll` is present so Pages does not run Jekyll over the tree and silently drop
paths beginning with an underscore.

## Known gaps

- **No `og:image`.** The Open Graph tags carry title, description and URL, but no
  image, because there is no image file in this repository to point at. A tag
  pointing at nothing is worse than an absent tag. Add a 1200x630 PNG and the
  matching `og:image` tag if link previews start to matter.
- **`favicon.svg` only.** Modern browsers are fine. Add `favicon.ico` if an old one
  needs to be.

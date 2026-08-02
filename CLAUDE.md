# ibiza4fun.github.io

A public, static site. It is a sibling of the Øyna repositories under
`C:\Users\bardb\repos`, so the workspace root `CLAUDE.md` and the unscoped rules in
`.claude/rules/` load on top of this file. Two things differ here, and they are the
reason this file exists.

## 1. This repository is public. The others are not.

Everything committed here is world-readable the moment it is pushed, and published
is published even after a delete. Before a page goes in `flater/`, read it - the
whole file, not the top - and check for:

- addresses, member names, phone numbers, coordinates
- IP addresses, hostnames, entity IDs, tokens, anything credential-shaped
- internal system detail that explains how an alarm or a lock can be defeated

Nothing is copied in from `oyna-*` or `lillehagveien-*` without that pass. When in
doubt the page does not go in - it stays where it already lives.

## 2. Language

The workspace rule holds for code, comments, commit messages, file names and this
documentation: English.

The exception is wider here than elsewhere. **Everything the reader sees is
Norwegian** - titles, guide steps, page copy, the front page. That is product text.
Bokmål, and æøå written as themselves.

File names stay English and ASCII, because a file name becomes a URL.

## Generated files

`index.html`, `sitemap.xml` and `sw.js` are written by `build.mjs`. Editing them by
hand is work that disappears at the next build. Change `templates/index.html`,
`templates/sw.js` or `build.mjs` instead.

## Before committing

```
npm run check
```

It refuses a page with no title, an unknown kind, a malformed date, a guide with no
steps, or an internal link that does not resolve. The same check gates the deploy.

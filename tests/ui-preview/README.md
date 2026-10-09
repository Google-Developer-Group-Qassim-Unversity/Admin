# UI preview

Screenshots real admin pages on a phone and a desktop without a Clerk session
or a backend. `shoot.mjs` bundles the actual pages inside the actual `AppShell`
(`entry.jsx`), compiles `app/globals.css`, stubs Clerk and Next's router
(`stubs/`), and answers every API call from `fixtures/*.mjs`.

```bash
cd Frontend
pnpm fonts                       # once: Thmanyah Sans, or screenshots use Tajawal
node tests/ui-preview/shoot.mjs --routes /,/pipeline,/events/209 \
  --viewports phone,desktop --locales ar,en --themes light,dark
```

Options: `--out dir` (default `.preview-shots/`, git-ignored), `--full` for a
full-page capture, `--scroll 600` to capture lower down. It uses
`CHROMIUM_PATH`, or `/usr/bin/chromium` when present
(`pnpm exec playwright install chromium` otherwise).

- **Routes** are listed in `entry.jsx`. Server-component pages are replaced by
  the client component they render.
- **Fixtures**: each file default-exports
  `[{ method?, path: RegExp, status?, body | (ctx) => body }]`, matched against
  the API path. Unmatched GETs answer `[]` and are listed after the run, so you
  can see which fixtures a page still needs. Keep one file per area.
- Page errors and console errors are printed under each screenshot, and make
  the run exit non-zero.

This is a visual check with sample data, not an integration test: the real
browser test for Club Structure lives in `tests/club-structure/`.

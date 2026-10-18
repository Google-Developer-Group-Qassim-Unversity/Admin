# Admin

The admin panel for GDG Qassim's score system (`admin.gdg-q.com`). Next.js with
Clerk auth; every piece of data comes from the `Backend` API.

## Three repositories

The system is split across three repos in the
`Google-Developer-Group-Qassim-Unversity` org, meant to be cloned side by side:

| Repo | What | Deployed at |
|------|------|-------------|
| [`Backend`](https://github.com/Google-Developer-Group-Qassim-Unversity/Backend) | FastAPI + SQLAlchemy + Alembic on MySQL; the one API every frontend calls | `refactor.albrrak773.com` (pm2 `GDG-backend`) |
| [`Admin`](https://github.com/Google-Developer-Group-Qassim-Unversity/Admin) | Next.js admin panel, Clerk auth | `admin.gdg-q.com` |
| [`Website`](https://github.com/Google-Developer-Group-Qassim-Unversity/Website) | Next.js public site: leaderboard, events, member profiles, wallet passes | `gdg-q.com` |

`Backend` and `Admin` were one repo, `score-leaderboard-Admin-app` (archived;
its issues and PRs #1-#173 are still there). `Website` was
`score-leaderboard-app`. A path written as `Admin/lib/access.ts` or
`Backend/app/helpers.py` means that file in the sibling repo.

A change that spans repos is one branch per repo with the same name - the PR
checks pick up the other repo's matching branch (falling back to `dev`) - and
the backend merges first, since the frontend expects its API to exist.

## Branches: everything goes through `dev`

**Never push to `main`, and never open a PR into `main`.** Branch from `dev`,
open the PR into `dev`. A merge to `dev` deploys staging
(`admin-dev.gdg-q.com`, against `scores_staging`, a copy of prod); `main` only
ever receives `dev`: once in a while, one large `dev` -> `main` PR, merged with
a merge commit, which deploys prod. Don't open that PR unless asked - its
timing is the team's call. PR checks run on PRs into `dev` only.

Staging and local dev redirect every email away from real members. See
`Backend/docs/STAGING.md`.

## When something is broken in production

The API is the usual suspect: read `Backend/docs/LOGGING.md`. Every response
carries an `X-Request-ID` header, which is also a Sentry tag, so a failed call
in the browser's network tab leads straight to its backend log lines. This app
runs in docker on the same VPS as the backend (`gdg-admin-web`, port 3012;
staging `gdg-admin-web-staging`, port 3013).

## The design system is "Mud & Doors"

Any UI work - a new page, a new component, a tweak - follows
[DESIGN.md](DESIGN.md) and is done with the **`impeccable`**
skill, which loads `PRODUCT.md` and `DESIGN.md` itself. The
design is settled: every UI task is a refinement inside it, so never run
impeccable's redesign / new-visual-world flow and never edit DESIGN.md or
PRODUCT.md unless asked for a design-system change. Do not invent a look;
extend this one:

- Colour is state, never decoration: green done, ochre waiting on someone,
  madder returned/overdue, indigo with a team/open, umber draft. Everything else
  is the limewash wall and mud ink, through the tokens in `app/globals.css`.
- Build from `components/najdi.tsx` (Door, Plate, Tarma, Courses, Mark, Count,
  SectionHead, Mortar, Shurfa) and the restyled `components/ui/*`; status
  colours come from `components/status-badge.tsx`, never per page.
- Phone first, Arabic first: ≥44px targets, rows not card grids, logical CSS,
  `<bdi>` on user content, dates through `useFormatters()` in `lib/format.ts`
  (Western digits, Gregorian calendar).
- Reem Kufi only for titles; Thmanyah Sans for everything else. Its licence
  forbids re-hosting it, so it is never committed: `pnpm fonts` fetches it.
- Check UI changes on phone and desktop, Arabic and English, light and dark,
  with `node tests/ui-preview/shoot.mjs` (see `tests/ui-preview/README.md`).
- Code written in the old four-colour look (brand-* classes, BrandRail,
  StatTile, round dots, card grids) is migrated, not patched: DESIGN.md §9 maps
  every old piece to its replacement and lists the exports that no longer exist
  (old `brand-*` classes compile to nothing, silently). Finish every UI change
  with DESIGN.md §10, the definition of done.

## The API layer is mid-migration

`lib/api/` is the API as one module - `useApi()` in a client
component, `serverApi()` in a route handler - and it holds the Clerk token
itself. `lib/api.ts` is the older half: 59 one-line wrappers that each
take an optional `getToken`, which callers thread down through hooks and
component props.

**The invariant: anything still taking `getToken` is on a resource that has not
migrated.** Threading it into a new hook or a new prop is the mistake to catch
in review; migrate the resource instead. `lib/api.ts`'s header comment lists
what has moved and the three steps for moving the next one.

The migrated calls throw `ApiRequestError` rather than returning
`ApiResponse<T>`, so there is one `ApiRequestError` class and `lib/api.ts`
re-exports it - defining a second would break the `instanceof` check that stops
react-query retrying 404s.

## Linear: use `linear-gdg`, never `linear`

This project's tickets live in the GDG Linear workspace, reached through the
`linear-gdg` MCP server declared in `.mcp.json` (run `/mcp` once to sign in with
the account that owns that workspace). A `linear` server, if one is loaded, is
some other workspace configured outside this repo: never read or write GDG
tickets through it.

## Commands

```bash
pnpm run typecheck            # tsc --noEmit
pnpm run lint
pnpm run dev                  # runs via infisical, port 3000
```

The Club Structure page has a browser check that runs against the real backend
and a real MySQL: it lives in `Backend/tests/test_club_structure_browser.py`
and drives `tests/club-structure/run.mjs` here. See
`tests/club-structure/README.md`. CI runs it on every PR, checking out the
`Backend` branch with the PR's name if there is one, else `dev`.

> This file is intentionally short and covers only what is easy to get wrong.
> Run `/init` if you want a fuller codebase overview generated.

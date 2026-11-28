# Admin

The GDG Qassim admin panel (`admin.gdg-q.com`): Next.js, Clerk, next-intl, react-query. All data comes
from the `Backend` API; the repos sit side by side, and `Backend/AGENTS.md` covers the API, its
environments and its migrations. `Backend/app/helpers.py` means that file in the sibling repo.

## Branches, deploys, environments

- Branch from `dev`, open PRs into `dev`. Never push to `main` or open a PR into it unless asked; a
  release is one `dev` -> `main` PR (`Backend/.claude/skills/releasing-to-production`).
- A merge to `dev` deploys staging (`admin-dev.gdg-q.com`, which calls `api-dev.gdg-q.com`); `main`
  deploys production. Both run in Docker on the VPS (`gdg-admin-web-staging` on port 3013,
  `gdg-admin-web` on 3012).
- A change that needs new API ships as same-named branches in Backend and here. Backend merges and
  deploys first. PR checks here check out Backend's same-named branch, else its `dev`.

## Commands

Secrets come from Infisical (`--path=/admin-frontend`); `pnpm run dev` wraps `infisical run`.

```bash
pnpm install              # a fresh worktree has no node_modules
pnpm fonts                # Thmanyah Sans; its licence forbids committing it
pnpm run dev              # port 3000; Website uses it too, Next moves to the next free port
pnpm run typecheck        # CI runs typecheck and lint
pnpm run lint             # 0 errors expected; existing warnings are fine
pnpm test                 # node:test unit tests in tests/*.test.ts
```

The Club Structure browser check runs from Backend (`RUN_CLUB_BROWSER=1 uv run pytest` there, with
this repo as `ADMIN_DIR`); see `tests/club-structure/README.md`.

## UI work follows DESIGN.md

The design ("Mud & Doors") is settled: read `DESIGN.md` §0, §8 and §10 before touching UI, and finish
with §10, its definition of done. Use the `impeccable` skill in refine/extend mode if it's installed.
Never redesign, and edit `DESIGN.md` or `PRODUCT.md` only when asked for a design-system change.
Screenshot UI changes with `node tests/ui-preview/shoot.mjs` (`tests/ui-preview/README.md`). It needs
no backend and no Clerk session.

## The API layer is mid-migration

`lib/api/` is the API as one module: `useApi()` in client components, `serverApi()` on the server,
and it holds the Clerk token itself. `lib/api.ts` is the older half, where wrappers take an optional
`getToken` that callers thread through hooks and props.

- Anything still taking `getToken` is on a resource that hasn't migrated. Never thread `getToken` into
  a new hook or prop: migrate the resource instead (three steps in `lib/api.ts`'s header comment).
- There is one `ApiRequestError` class, re-exported by `lib/api.ts`. A second class breaks the
  `instanceof` check that stops react-query retrying 404s.

## Linear

GDG tickets (`GDG-54`) live in the GDG Linear workspace: the `linear-gdg` MCP server from `.mcp.json`, or
`linear-gdgq` in Albrrak773's own setup. Never read or write them through another Linear server.

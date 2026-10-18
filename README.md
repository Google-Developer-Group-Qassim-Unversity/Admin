# Admin

The admin panel for GDG Qassim's score system, at
[admin.gdg-q.com](https://admin.gdg-q.com). Next.js with Clerk auth; all data
comes from the [Backend](https://github.com/Google-Developer-Group-Qassim-Unversity/Backend)
API. The public site is [Website](https://github.com/Google-Developer-Group-Qassim-Unversity/Website).

```bash
pnpm install
pnpm fonts            # Thmanyah Sans; its licence forbids committing it
pnpm run dev          # runs via infisical, port 3000
pnpm run typecheck
pnpm run lint
```

Start with [CLAUDE.md](CLAUDE.md) for how the repos fit together and the
branch flow, then [DESIGN.md](DESIGN.md) before any UI work.

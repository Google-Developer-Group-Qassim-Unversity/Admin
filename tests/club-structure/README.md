# Club Structure browser integration

This runner bundles the actual Club Structure page, shared components, API client,
query provider, translations and freshly compiled Tailwind CSS. Chromium calls the
real FastAPI routes over HTTP using the MySQL database created by pytest. API
responses are not mocked. Test identities replace Clerk's browser hooks and JWT
verification; the backend's real permission guards still run. Public leaderboard
cache calls are stubbed. No production auth bypass or test route is added.

The test itself lives in the Backend repo
(`tests/test_club_structure_browser.py`), which spins up the API and MySQL and
runs this script. With both repos cloned side by side, install this repo's
dependencies and Chromium from its root:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

Then, from the Backend repo, with Docker available and `DATABASE_URL` unset:

```bash
RUN_CLUB_BROWSER=1 uv run pytest tests/test_club_structure_browser.py
```

If this repo is not at `../Admin` from the Backend repo, point `ADMIN_DIR` at
it. To use an installed browser, set `CHROMIUM_PATH=/usr/bin/chromium`. The
ordinary backend suite skips this browser check when `RUN_CLUB_BROWSER` is
unset. CI runs it from both repos' `.github/workflows/pr.yml` (checking out the
other repo's branch with the same name, else `dev`), without application
secrets, and saves screenshots as an artifact. Python's failure output includes
the local screenshot directory.

The check covers creation and settings, roster additions/removals, leader and VP
seats (with their explicit member rows), the two Leadership leaders shown publicly
as the presidents, the Board as an ordinary unranked department, distinct member
counts, an open stale confirmation, competing HTTP grants, repeated
archive/restore, copying a semester's structure into an empty one, role
permissions, a 480px desktop drawer, and English/Arabic mobile layouts in
light/dark themes. The regular backend tests cover transaction rollback,
independent-connection races, database constraints, full route authorization,
points retention, and migration behavior.

The UI structure is compared with the React source supplied for the
[Figma Make design](https://www.figma.com/make/usYqch40Q7dRmRsuTdvTHi/Design-Club-Structure-Page).
The implementation uses the app's theme and navigation, adds a semester picker
and per-semester rosters, and counts distinct people. This is not a pixel snapshot of the Figma
preview, a live Clerk sign-in test, or a deployment check.

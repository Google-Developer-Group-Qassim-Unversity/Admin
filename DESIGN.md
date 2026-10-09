# GDG Qassim admin — design system: Mud & Doors

A guide for anyone (human or agent) building UI in this app. The goal is that a
new page looks like it was always here. **When in doubt, copy an existing
page**; this file explains the rules those pages follow.

The console is a **Najdi house in Qassim**. Limewashed walls are the calm
ground. Colour lives only on the **painted wooden doors**, and every door is
something you can open: your turn, a request, a team's inbox, a day on the
calendar. Triangular **tarma** openings mark progress, the stepped **shurfa**
parapet tops the header, and the booking calendar is a **course of bricks** in
mortar.

> **Source of truth is the code.** Tokens live in `app/globals.css`; the
> vocabulary lives in `components/najdi.tsx`, `components/status-badge.tsx`,
> `components/page-header.tsx`, `components/brand-mark.tsx` and
> `components/app-shell.tsx`. If this file and the code disagree, the code wins;
> fix this file.

---

## 1. Colour is state

Five door colours, each a state. Nothing is coloured "because it looks nice".

| Door | Means | Examples |
| --- | --- | --- |
| **green** | done, live, published | task done, event running, Submit / Publish / Mark done |
| **ochre** | waiting on someone, usually the reader | your turn, a held draft, Book dates, Continue |
| **madder** | returned, overdue, failed, closed | a returned request, attendance never closed, a closed day |
| **indigo** | with a team, open, informational | in review, open for registration, a booked day, links |
| **umber** | draft, inactive | a draft event, an archived thing |

Everything else is the wall: limewash `bg-background`, raised plaster
`bg-card`, sunk `bg-sunk`, one-pixel rules `border-rule`, mud ink
`text-foreground`, and two quieter inks `text-ink-2` (secondary text) and
`text-ink-3` (only for large or non-essential text: it is 3.9:1).

Each door has four utilities, all theme-aware:

| Utility | Use |
| --- | --- |
| `bg-door-green` | a solid plate (an icon plate, a booked day, a door). Text on it: `text-on-door` (green/madder/indigo/umber) or `text-on-door-ochre` |
| `bg-door-green-soft` | a tinted ground (a chip, a highlighted row) |
| `text-door-green-ink` | text on the wall or on the soft ground (AA-checked) |
| `border-door-green` | an edge |

In code, prefer the maps in `components/najdi.tsx` over hand-written classes:
`PLATE[tone]`, `SOFT[tone]`, `INK[tone]`, `FILL[tone]`, all keyed by
`DoorTone`. Status → tone mappings live in `components/status-badge.tsx`
(`URGENCY_TONE`, `STAGE_TONE`, `STAGE_STEP`, `PIPELINE_DAY_STYLES`); add a new
state there, never per page.

The old `brand-blue/red/yellow/green` utilities still work (they are aliased to
indigo/madder/ochre/green) only so the migration can happen page by page.
**New code uses `door-*`**; no `brand-*` should survive the rewrite.

**One door per region.** A screen gets at most one big painted `Door` (the one
thing waiting on the reader). Elsewhere colour appears as small plates, square
marks and soft chips. Three values at rest: limewash, mud ink, and one door
colour per region.

Dark mode is **night adobe** (deep warm brown, never black). If you build with
the tokens it just works; never write a hex or a `dark:` colour that bypasses a
token.

---

## 2. Type

- **UI: Thmanyah Sans** (`font-sans`, the default) for everything, both
  scripts. It is fetched from Thmanyah's site by `pnpm fonts`
  (`scripts/fetch-thmanyah.mjs`, also run in the Docker build) because its
  licence forbids re-hosting it, so the files are git-ignored. Without them
  Tajawal takes over automatically.
- **Display: Reem Kufi** (`font-display`): page titles (`h1` gets it
  automatically), door headings, dialog titles, the top-bar title, the brand.
  Never for labels, buttons, data or body text.
- **Rank by weight and case, not size.** The scale is tight: 12 / 13 / 14 / 15 /
  16 / 19 / 21 / 26–30. Section headings are 16px **bold** with a one-pixel ink
  rule under them (`SectionHead`), not big type.
- **Aligned numbers**: `.tabular` on counts, times, IDs, countdowns.

---

## 3. Shape, depth, motion

- **Carved timber, not pebbles.** Radii are small: `rounded-lg` = 4px (buttons,
  inputs, rows), `rounded-xl` = 6px (panels, doors, dialogs). `rounded-full` is
  only for the grab handle and avatars that come from Clerk. Status marks are
  **squares** (`Mark`), not dots.
- **Plates have depth**: `plate-depth` (a hairline edge and a darker bottom
  rail). Panels have none: a raised plaster panel is `bg-card ring-1 ring-rule
  rounded-xl`, no shadow. Only a `Door` casts a soft shadow.
- **Rules are one pixel.** Section heads and the bottom bar use an ink rule
  (`border-foreground`); everything else `border-rule`.
- **The wall** has faint plaster courses every 32px, painted on `body`. Don't
  add other textures.
- **Motion** is short (150–200ms), ease-out, and only shows a change of state:
  press (`active:translate-y-px`), hover tint, a sheet sliding up. No entrance
  choreography. Respect `prefers-reduced-motion`.

---

## 4. The vocabulary (`components/najdi.tsx`)

| Piece | What it is |
| --- | --- |
| `Door` | A painted door with carved bands top and bottom. The one big coloured surface on a screen: your turn, a team task, a hold. `tone` defaults to ochre. |
| `DoorPanel` | The light panel set into a door, where the details sit. |
| `Plate` | An icon on a small painted door (`sm` / `md` / `lg`). Leads list rows. |
| `Tarma` | Five triangular openings: how far a request has come. `current`, `tone`, `returned`, `done`, `label`. |
| `Courses` | Bricks in a course: `done` of `total` filled in (a form section, a checklist). |
| `Mark` | A small square state mark. |
| `Count` | A square counter: ink, or ochre when it is waiting on the reader. |
| `SectionHead` | 16px bold heading, ink rule under it, optional count and trailing action. |
| `Mortar` | A grid whose gaps read as mortar: bricks inside (calendar, segmented strips, stage strips). |
| `Shurfa` | The stepped parapet edge; give it the colour of the header it tops. |
| `Fact` | A term/value pair for a `<dl>`. |

Elsewhere:

- `GdgLogo` (`components/brand-mark.tsx`): the GDG chevrons. The app's logo.
- `PageHeader`: every top-level page opens with it. Title in Reem Kufi on the
  wall, description, actions trailing, an ink rule under it. No banner card.
- `StatusBadge` / `StageBadge` / `StatusDot` / `UrgencyDot`: square-marked pills.
- `Button` variants: `default` (mud ink, the everyday action), `outline`,
  `secondary`, `ghost`, `link`, `destructive` (soft madder), and the door
  plates `ochre` (the action waiting on the reader), `green` (finish: submit,
  publish, mark done), `madder` (irreversible), `indigo` (rare).
- `Badge` variants add `green` / `ochre` / `madder` / `indigo` soft chips.
- `Tabs`: the default list is a mortar tray with an ink-filled active segment;
  `variant="line"` is an ink underline. `SegmentedControl` matches the tray.

The previous design's `BrandArcs`, `BrandRail` and `AppBackground` render
nothing and are deprecated; delete their calls. `StatTile` and the old
dashboard cards belong to the previous design.

---

## 5. The shell

`AppShell` wraps every page:

- **Desktop**: a raised-plaster sidebar (logo, nav groups, the Pipeline entry
  with an ochre count of what is waiting on your teams, and the ochre **Book
  dates** button at the foot), and a top bar crowned by the shurfa with the page
  title, ⌘K search, language, theme, notifications and the avatar.
- **Phone**: the same top bar, and a bottom bar with Home, Pipeline, the ochre
  **Book dates** door in the middle, Events and More. More is a bottom sheet
  with the rest of the nav plus theme and language. `main` pads itself so
  content clears the bar. Anything pinned to the bottom of the screen on a phone
  sits above it: `bottom-[calc(4rem+env(safe-area-inset-bottom))]`.
- Book dates links to `/pipeline?book=1`, which opens the booking calendar in
  booking mode.

A new nav entry goes in `NAV_GROUPS` with a Lucide icon and labels in both
`messages/*.json` under `nav`.

---

## 6. Page recipe

```tsx
<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
  <PageHeader title={t("title")} description={t("subtitle")} icon={SomeIcon}>
    <Button asChild><Link href="/thing/create">{t("create")}</Link></Button>
  </PageHeader>

  <section className="flex flex-col gap-2">
    <SectionHead title={t("list")} count={items.length} action={<Link …>{t("all")}</Link>} />
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="border-rule flex min-h-16 items-center gap-3 border-b px-1 py-3">
          <Plate tone="indigo" icon={Icon} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <b className="truncate font-bold">{item.title}</b>
            <span className="text-ink-2 text-[13px]">{item.meta}</span>
          </div>
          <ChevronRight className="text-ink-3 size-[18px] rtl:-scale-x-100" />
        </li>
      ))}
    </ul>
  </section>
</div>
```

**Rows on the wall beat cards.** A list is rows separated by one-pixel rules,
led by a plate, not a grid of identical cards. Use a raised panel (`bg-card
ring-1 ring-rule rounded-xl`) to group a region on desktop; never nest panels.

Icons are **Lucide**, 18px, stroke 1.75. Don't mix icon sets; no emoji.

---

## 7. Phones

Admins run the club from their phones: starting and continuing requests,
working the team inbox, checking where things stand, checking people in. Every
page has to work at 360px wide with a thumb.

- **Touch targets ≥ 44px.** `Button`, `Input`, `SelectTrigger`, tabs and menu
  items already grow on `pointer-coarse`.
- **Dialogs are bottom sheets** below `sm` (`components/ui/dialog.tsx`).
- **Tables become lists** below `md`: a row per record (plate, title, one muted
  meta line, a status pill, a chevron or a trailing action). Keep the table for
  `md:` up.
- **One column.** Side panels collapse under the main content.
- **Sticky action bars** for long tasks (book, submit, save): `bg-card
  border-t border-foreground`, above the bottom bar, primary action on the
  trailing side.
- **No fixed widths, no hover-only actions, no sideways page scroll.**
- **Inputs** get the right `type` / `inputMode` / `enterKeyHint` and stay 16px.

Reach for `FilterBar`, `ListPager`, `FormActions` and `SegmentedControl`
before writing bespoke mobile code.

---

## 8. Non-negotiables

- **Complete class literals.** Tailwind scans source text; map tones to full
  class strings (see `najdi.tsx`), never `` `bg-door-${tone}` ``.
- **RTL first.** Arabic is the primary language. Logical properties only
  (`ms/me`, `ps/pe`, `start/end`, `text-start`); flip directional icons with
  `rtl:-scale-x-100`.
- **i18n always.** Every string through `next-intl`, in both `messages/en.json`
  and `messages/ar.json`, ICU plurals for counts. The dashboard speaks the
  club's Najdi Arabic (`وش`, `الحين`); keep that voice where it already exists.
- **Only real data.** Show what an endpoint returns or what can be derived from
  one. No invented feeds, tickers or totals.
- **Theme via tokens only.**
- **Verify** with the preview tool: `node tests/ui-preview/shoot.mjs --routes
  /,/pipeline --viewports phone,desktop --locales ar,en --themes light,dark`
  renders real pages with fixture data (`tests/ui-preview/README.md`).

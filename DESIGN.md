---
name: GDG Qassim Admin
description: Mud & Doors - limewash walls, colour only on painted Najdi doors, each door colour a state.
colors:
  limewash: "#f3f0e9"
  plaster: "#fbfaf6"
  sunk: "#eae4d8"
  rule: "#dcd2c1"
  mortar: "#ddd3c2"
  adobe: "#b8916b"
  mud-ink: "#3a2a1f"
  ink-2: "#6a5443"
  ink-3: "#786150"
  door-green: "#1f6b57"
  door-ochre: "#d39a1c"
  door-madder: "#a63a2b"
  door-indigo: "#2b4a7e"
  door-umber: "#6a5443"
  on-door-ochre: "#2b1c0c"
  night-adobe: "#1b1612"
  night-plaster: "#241d18"
typography:
  display:
    fontFamily: "Reem Kufi, Thmanyah Sans, Tajawal, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Reem Kufi, Thmanyah Sans, Tajawal, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.2
  section:
    fontFamily: "Thmanyah Sans, Tajawal, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Thmanyah Sans, Tajawal, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Thmanyah Sans, Tajawal, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
spacing:
  course: "8px"
  row: "12px"
  section: "24px"
  wall: "32px"
components:
  button-default:
    backgroundColor: "{colors.mud-ink}"
    textColor: "{colors.limewash}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-ochre:
    backgroundColor: "{colors.door-ochre}"
    textColor: "{colors.on-door-ochre}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-green:
    backgroundColor: "{colors.door-green}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.mud-ink}"
    rounded: "{rounded.lg}"
    height: "44px"
  input:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.mud-ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.plaster}"
    rounded: "{rounded.xl}"
    padding: "16px 20px"
  plate:
    backgroundColor: "{colors.door-indigo}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.lg}"
    size: "40px 44px"
  door:
    backgroundColor: "{colors.door-ochre}"
    textColor: "{colors.on-door-ochre}"
    rounded: "{rounded.xl}"
    padding: "12px 16px 16px"
---

# GDG Qassim admin — design system: Mud & Doors

A guide for anyone (human or agent) building UI in this app. The goal is that a
new page looks like it was always here.

The console is a **Najdi house in Qassim**. Limewashed walls are the calm
ground. Colour lives only on the **painted wooden doors**, and every door is
something you can open: your turn, a request, a team's inbox, a day on the
calendar. Triangular **tarma** openings mark progress, the stepped **shurfa**
parapet tops the header, and the booking calendar is a **course of bricks** in
mortar.

> **Source of truth is the code.** Tokens live in `app/globals.css`; the
> vocabulary lives in `components/najdi.tsx`, `components/status-badge.tsx`,
> `components/page-header.tsx`, `components/brand-mark.tsx`,
> `components/app-shell.tsx` and `lib/format.ts`. If this file and the code
> disagree, fix whichever is wrong and say so.

---

## 0. How to work here

- **This design is settled. Every UI task is a refinement inside it**: a new
  page, a new component, a tweak, or migrating code from the old design. Use the
  **impeccable** skill (it loads `Frontend/PRODUCT.md` and this file) in its
  refine/extend mode. Never run its redesign or new-visual-world flow, never
  propose a new look, and never edit this file or `PRODUCT.md` unless the user
  asks for a design-system change.
- **Reference pages** to copy structure from: the dashboard (`app/page.tsx`),
  the pipeline request view (`components/pipeline/request-view.tsx`), the
  events list (`app/events/events-content.tsx`) and members
  (`app/manage-members/manage-members-content.tsx`). If something in a page
  contradicts this file, this file wins; fix the page if you are touching it.
- Finish with the **definition of done** (§10).

---

## 1. Colour is state

Five door colours, each a state, plus the neutral wall. Nothing is coloured
"because it looks nice".

| Tone | Means | Examples |
| --- | --- | --- |
| **green** | done, live, published | task done, event running, Submit / Publish / Mark done |
| **ochre** | waiting on someone, usually the reader | your turn, a held draft, Book dates, Continue |
| **madder** | returned, overdue, failed, closed | a returned request, attendance never closed, a closed day |
| **indigo** | with a team, open, informational | in review, open for registration, a booked day, links |
| **umber** | draft, inactive, hidden, archived | a draft event, a hidden custom event, a past semester |
| **neutral** | no state at all | a page icon, a member, a setting, an email log row, an asset |

**Neutral is not umber.** If the honest answer to "which state is this?" is
"none", the tone is `neutral` (sunk plaster, ink icon). Umber means draft or
inactive.

The wall: limewash `bg-background`, raised plaster `bg-card`, sunk `bg-sunk`,
one-pixel rules `border-rule`, `bg-mortar` for mortar joints, `border-adobe` /
`stroke-adobe` for quiet strokes, mud ink `text-foreground`, and two quieter
inks `text-ink-2` (secondary text) and `text-ink-3` (quietest, still AA). The
shadcn names `text-muted-foreground`, `bg-muted` and `border-border` still work
and resolve to the same wall colours; new code uses the house names.

Each door has these utilities, all theme-aware:

| Utility | Use |
| --- | --- |
| `bg-door-green` | a solid plate (an icon plate, a booked day, a door). Text on it: `text-on-door` (green/madder/indigo/umber) or `text-on-door-ochre` |
| `bg-door-green-soft` | a tinted ground (a chip, a highlighted row) |
| `text-door-green-ink` | text on the wall or on the soft ground (AA-checked) |
| `border-door-green` | an edge |

In code, use the maps in `components/najdi.tsx` rather than hand-written
classes: `PLATE[tone]`, `SOFT[tone]`, `INK[tone]`, `FILL[tone]`, keyed by `Tone`
(`DoorTone` plus `neutral`).

**Status → tone lives in `components/status-badge.tsx` only**: `EVENT_TONE`,
`URGENCY_TONE`, `STAGE_TONE`, `STAGE_STEP`, `PIPELINE_DAY_STYLES`
(`eventTone()` in `components/event-bits.tsx` adds "overdue" for an active event
that has ended). To show a **new kind of status**, add a `X_TONE` map there and
render it with `StatePill tone={X_TONE[value]}`; never give a page its own
status colours.

**Department colours** are identity, not state. They appear only where the
department itself is the subject (its plate on Club Structure). Everywhere else
a department is plain text or a neutral chip.

The old `brand-blue/red/yellow/green` utilities are **gone**. They compile to
nothing without an error, so a forgotten one silently loses its colour: grep for
`brand-` (§10).

**One door per region.** A screen gets at most one big painted `Door` (the one
thing waiting on the reader). Elsewhere colour appears as small plates, square
marks and soft chips. Three values at rest: limewash, mud ink, and one door
colour per region.

Dark mode is **night adobe** (deep warm brown, never black). If you build with
the tokens it just works; never write a hex or a `dark:` colour that bypasses a
token.

**Charts**, if one is ever needed: a series gets a door colour only if it is a
state; otherwise ink and adobe. `chart-1…5` map to the doors.

---

## 2. Type

- **UI: Thmanyah Sans** (`font-sans`, the default) for everything, both
  scripts. It is fetched from Thmanyah's site by `pnpm fonts`
  (`scripts/fetch-thmanyah.mjs`, also run in the Docker build) because its
  licence forbids re-hosting it, so the files are git-ignored. Without them
  Tajawal takes over automatically.
- **Display: Reem Kufi** (`font-display`), for **titles** only: the page title
  (`h1`, which gets it automatically; 26px, 30px from `sm`), the heading painted
  on a `Door`, dialog and sheet titles (built into `DialogTitle` / `SheetTitle`),
  the top-bar title and the brand. A heading that introduces a section of a page
  is a `SectionHead` in the UI face, never Reem Kufi. Never for labels, buttons,
  data or body text.
- **Rank by weight and case, not size.** The scale is tight: 12 / 13 / 14 / 15 /
  16 / 19 / 21 / 26–30. Section headings are 16px **bold** with a one-pixel ink
  rule under them (`SectionHead`).
- **Aligned numbers**: `.tabular` on counts, times, IDs, countdowns.
- **Dates and numbers** go through `lib/format.ts`: `useFormatters()` (`date`,
  `dateTime`, `time`, `range`, `number`, `custom`) and `useTimeAgo()` ("3 hours
  ago"), all in the reader's language with **Western digits and the Gregorian
  calendar in both languages**. Outside React, `intlLocale(locale)` gives the
  same Intl locale. Never `toLocaleString()` without a locale, never a
  hard-coded `en-US` / `en-GB`, never `ar-SA` (Arabic-Indic digits, Hijri on
  some builds), never date-fns `format` for anything displayed. The shared
  `Calendar` and `DateTimeRangePicker` are already localized.
- **Mixed directions.** User content (names, titles, locations, venues) can be
  Arabic inside the English UI and the reverse. Wrap the text in `<bdi>` so it
  keeps its own direction while the block keeps the UI's alignment. Use
  `dir="auto"` only on an element that holds nothing but that content (an input,
  a standalone cell), and never on both a parent and its child. When user
  content is interpolated into a translated sentence, wrap it with `isolate()`
  from `lib/format.ts`.

---

## 3. Shape, depth, motion

- **Carved timber, not pebbles.** Radii are small: `rounded-lg` = 4px (buttons,
  inputs, rows), `rounded-xl` = 6px (panels, doors, dialogs). `rounded-full` is
  only for the sheet grab handle and avatars that come from Clerk. Status marks
  are **squares** (`Mark`), not dots.
- **Plates are paint**: `plate-depth` gives a hairline edge and a faint lower
  rail (built into `Plate` and the door-plate `Button` variants). Never more: no
  bevels, embossing or glossy highlights.
- **Panels** are `bg-card ring-1 ring-rule rounded-xl` with no shadow, and are
  never nested.
- **Shadows** come from three tokens only: `shadow-[var(--shadow-door)]` (a
  `Door`, built in), `shadow-[var(--shadow-lift)]` (a card lifting on hover or
  while dragged) and `shadow-[var(--shadow-float)]` (popovers, menus, sticky
  bars, floating buttons). Rows and panels at rest have none.
- **Rules are one pixel.** Section heads, sticky bars and the bottom nav use an
  ink rule (`border-foreground`); everything else `border-rule`.
- **The wall** has faint plaster courses every 32px, painted on `body`. Don't
  add other textures.
- **Motion** is short (150–200ms), ease-out, and only shows a change of state:
  press (`active:translate-y-px`), hover tint, a sheet sliding up. The one
  authored moment is the tarma filling in order (`animate-tarma`, built into
  `Tarma`). No other entrance choreography. Respect `prefers-reduced-motion`.
- **Icons** are Lucide, 18px, stroke 1.75. Don't mix icon sets; no emoji.

---

## 4. The vocabulary

`components/najdi.tsx`:

| Piece | What it is |
| --- | --- |
| `Door` | A painted door with carved bands top and bottom: the one big coloured surface on a screen, for the thing waiting on the reader (your turn, a team task, a hold, an overdue close). `tone` defaults to ochre. Its heading is Reem Kufi; put one primary action on it. |
| `DoorPanel` | The light panel set into a door, where the details sit. |
| `Plate` | An icon on a small painted door (`size` `sm` / `md` / `lg`, `tone` any `Tone` incl. `neutral`). Leads list rows. |
| `Tarma` | Five triangular openings: how far a request has come. Props: `current` (0-based step), `tone` (whose turn), `returned`, `done`, `label` (screen-reader words), `onDoor` (when drawn on a `Door`), `total`, `size`. Mirrors itself in RTL. |
| `Courses` | Bricks in a course: `done` of `total` filled (a form section, a checklist, a job). |
| `Mark` | A small square state mark. |
| `Count` | A square counter: ink by default, `tone="ochre"` when it is waiting on the reader, `tone="madder"` when overdue. |
| `SectionHead` | 16px bold heading, ink rule under it, optional `count` / `countTone` and a trailing `action`. |
| `Mortar` | A grid whose gaps read as mortar: bricks inside (calendar, segment trays, stage strips). |
| `Shurfa` | The stepped parapet edge; give it the colour of the header it tops. |
| `Fact` | A term/value pair for a `<dl className="grid grid-cols-[max-content_1fr]">`. |
| `RowsSkeleton` | Loading rows at the real row height (`rows`). |
| `EmptyLine` | An empty list: one quiet line and an optional action. |

`components/status-badge.tsx`: `StatusBadge` (an event status pill),
`StageBadge` (a pipeline stage pill), `StatePill` (a pill for any tone; use it
for every other status), `StatusDot` and `UrgencyDot` (bare square marks), and
the tone maps (§1).

Elsewhere:

- `GdgLogo` (`components/brand-mark.tsx`, prop `height`): the app's logo.
- `PageHeader` (`components/page-header.tsx`): every top-level page except the
  dashboard opens with it (the dashboard opens with its greeting, same type).
  Title on the wall, description, actions trailing, an ink rule under it, the
  page's nav icon on a neutral plate.
- `Button` variants: `default` (mud ink, the everyday action), `outline`,
  `secondary`, `ghost`, `link`, `destructive` (soft madder), and the door
  plates `ochre` (the action waiting on the reader), `green` (finish: submit,
  publish, mark done), `madder` (irreversible: delete for good), `indigo`
  (rare). One painted button per region; the rest are `default` or `outline`.
- `Badge` variants add `green` / `ochre` / `madder` / `indigo` soft chips.
- `Tabs`: the default list is a mortar tray with an ink-filled active segment;
  `variant="line"` is an ink underline (use it for page-level tabs).
  `SegmentedControl` matches the tray, for 2–4 choices.
- `FilterBar`, `ListPager`, `FormActions` (a sticky action bar on phones).
- Dashboard pieces (`components/dashboard/overview.tsx`): `Stats`,
  `StageStrip`, `StageBoard`, `AttentionList`, `EventsNow`, `TeamInbox`; and
  `YourTurn` (`your-turn.tsx`).
- Event pieces (`components/event-card.tsx`, `components/event-bits.tsx`):
  `EventRow`, `EventPosterTile`, `NextStepChip`, `eventTone()`.

---

## 5. The shell

`AppShell` wraps every page:

- **Desktop**: a raised-plaster sidebar (logo, nav groups, the Pipeline entry
  with an ochre count of what is waiting on your teams, and the ochre **Book
  dates** button at the foot), and a top bar crowned by the shurfa with the page
  title, ⌘K search, language, theme, notifications and the avatar.
- **Phone**: the same top bar, and a bottom bar with Home, Pipeline (with the
  same count), the ochre **Book dates** door in the middle, Events and More.
  More is a bottom sheet with the rest of the nav plus theme and language.
  `main` pads itself so content clears the bar. Anything pinned to the bottom of
  the screen on a phone sits above it:
  `bottom-[calc(4rem+env(safe-area-inset-bottom))]`.
- Book dates links to `/pipeline?book=1`, which opens the booking calendar in
  booking mode.

A new nav entry goes in `NAV_GROUPS` (`components/app-shell.tsx`) with a Lucide
icon and labels in both `messages/*.json` under `nav`.

---

## 6. Page recipe

```tsx
<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
  <PageHeader title={t("title")} description={t("subtitle")} icon={SomeIcon}>
    <Button asChild><Link href="/thing/create">{t("create")}</Link></Button>
  </PageHeader>

  <section aria-labelledby="things" className="flex flex-col gap-1">
    <SectionHead id="things" title={t("list")} count={items.length} />
    {isPending ? (
      <RowsSkeleton />
    ) : items.length === 0 ? (
      <EmptyLine action={<Button asChild variant="outline" size="sm"><Link href="/thing/create">{t("create")}</Link></Button>}>
        {t("empty")}
      </EmptyLine>
    ) : (
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="border-rule relative flex min-h-16 items-center gap-3 border-b px-1 py-3 hover:bg-card">
            <Plate tone={THING_TONE[item.status] ?? "neutral"} icon={Icon} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={`/thing/${item.id}`} className="truncate font-bold after:absolute after:inset-0">
                <bdi>{item.title}</bdi>
              </Link>
              <span className="text-ink-2 text-[13px]">{fmt.date(item.created_at)}</span>
            </div>
            <StatePill tone={THING_TONE[item.status]}>{t(`status.${item.status}`)}</StatePill>
            <ChevronRight aria-hidden className="text-ink-3 size-[18px] rtl:-scale-x-100" />
          </li>
        ))}
      </ul>
    )}
  </section>
</div>
```

**Rows on the wall beat cards.** A list is rows separated by one-pixel rules,
led by a plate, not a grid of identical cards. Group a region on desktop with a
raised panel; never nest panels.

**Table or rows.** Use a table only on `md:` up, inside a raised panel, when
there are four or more comparable or sortable columns (members, responses,
email logs, the actions catalogue). Below `md` the same records are rows.
Everything else is rows at every width.

**States.** Every list and panel has all four: loading (`RowsSkeleton`, or
`Skeleton` shaped like the content; never a spinner in the middle of content),
empty (`EmptyLine`: say what would be here, offer the action that fills it; a
whole empty page may use `Empty`), error (`Alert variant="destructive"` with
what went wrong and a retry), and the real content.

**Forms and dialogs.** A task that needs a page of fields, or that people come
back to, is a page with `FormActions`; a short decision or a few fields is a
`Dialog` (a bottom sheet on phones). Group long forms with `SectionHead`s;
show how much of a section is filled with `Courses` only when the counts are
real. Destructive confirmations use `AlertDialog` with a `madder` action.

**Toasts** (`sonner`) confirm what just happened in one line; they are already
themed with the door colours.

---

## 7. Phones

Admins run the club from their phones: starting and continuing requests,
working the team inbox, checking where things stand, checking people in. Every
page has to work at 360px wide with a thumb.

- **Touch targets ≥ 44px.** `Button`, `Input`, `SelectTrigger`, tabs and menu
  items already grow on `pointer-coarse`.
- **Dialogs are bottom sheets** below `sm` (`components/ui/dialog.tsx`).
- **One column.** Side panels collapse under the main content; the list comes
  before secondary numbers (no row of big-number tiles above a list: one summary
  line instead).
- **Sticky action bars** for long tasks (book, submit, save): `bg-card
  border-t border-foreground`, above the bottom bar, primary action on the
  trailing side, one line where possible.
- **No fixed widths, no hover-only actions, no sideways page scroll.**
- **Inputs** get the right `type` / `inputMode` / `enterKeyHint` and stay 16px.

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
- **The API layer.** New components never take or thread `getToken`; see
  "Frontend: the API layer is mid-migration" in the root `CLAUDE.md`.

---

## 9. Migrating code from the old design

Code written before the rewrite (the four-colour "GDG Playbook" look:
Manrope/Outfit, Google blue buttons, arcs, rails, round dots, KPI tiles) is
redone in this language, not patched. Several old exports **no longer exist**,
so old code will not compile until it is migrated, and old `brand-*` classes
silently render without colour.

| Old | New |
| --- | --- |
| `brand-blue` / `brand-red` / `brand-yellow` / `brand-green` (`bg-`, `text-`, `border-`, `-soft`, `-ink`) | first ask which **state** it shows: `door-indigo` / `door-madder` / `door-ochre` / `door-green` with the same suffix, or the wall (`bg-card`, `text-ink-2`, `border-rule`) if none |
| `BrandMark size={n}` | `GdgLogo height={n * 0.8}` (`components/brand-mark.tsx`) |
| `BrandArcs`, `BrandRail`, `AppBackground`, the `brand-hero` class | removed (imports fail): delete them; there is no replacement decoration |
| `StatTile`, a grid of KPI tiles | `Stats` from `components/dashboard/overview.tsx` (any number of stats; a strip on desktop, one line on phones), or your own one-line summary |
| `PipelineCard`, `AttentionQueue` | `StageStrip` / `StageBoard`, `AttentionList` (`items`, `isPending`, `panel`) from `components/dashboard/overview.tsx` |
| `EventCard`, `events-list`, `event-filters`, `events-list-skeleton` | `EventRow`, `EventPosterTile`, `NextStepChip` (`components/event-card.tsx`), `FilterBar`, `RowsSkeleton` |
| `URGENCY_STYLES[x].pill` / `.dot` | `StatePill tone={URGENCY_TONE[x]}` / `UrgencyDot` |
| `PageHeader … arcSize` | `PageHeader` without `arcSize` |
| round status dots (`rounded-full size-2`) | `Mark` (a square), `StatusBadge` / `StageBadge` / `StatePill` |
| a coloured icon chip (`bg-brand-x-soft rounded-xl` + icon) | `Plate` with the state's tone, or `tone="neutral"` |
| a status pill with its own colours | a tone map in `status-badge.tsx` + `StatePill` |
| a grid of same-size cards | rows on the wall (§6), a table only for 4+ comparable columns on desktop |
| a hero banner or highlighted card for "the thing to do now" | one `Door` (ochre by default) with a `DoorPanel` and one action |
| `font-display` for small headings, labels or numbers | `SectionHead` / `font-bold` in the UI face; `font-display` (now Reem Kufi) is for titles only |
| blue primary button for every action | `Button` `default` (mud ink); `ochre` for the action waiting on the reader; `green` to finish; `madder` for irreversible |
| `rounded-2xl` / `rounded-3xl` / pill-shaped containers | `rounded-xl` (6px) panels, `rounded-lg` (4px) controls |
| `toLocaleDateString()`, date-fns `format`, `en-US`, `ar-SA` | `useFormatters()` / `useTimeAgo()` / `intlLocale()` |
| a progress bar or ring for a request or checklist | `Tarma` (a request's five steps) or `Courses` (n of total) |
| an ad-hoc shadow (`shadow-md`, `rgb(...)`) on a card | none at rest; `var(--shadow-lift)` on hover/drag |

---

## 10. Definition of done for any UI change

1. You worked with the **impeccable** skill in refine/extend mode (§0) and
   started from a reference page.
2. `rg -n "brand-|rounded-full|toLocale|ar-SA|en-US|#[0-9a-fA-F]{3,6}\b|dark:(bg|text|border)-" <your files>`
   finds nothing outside email HTML templates (sent emails keep their own
   inline styles).
3. Every colour answers "which state is this?" with a door tone or `neutral`;
   at most one `Door` and one painted button per region; status colours come
   from `status-badge.tsx`.
4. Loading, empty and error states exist (§6).
5. Phone at 360–390px: one column, rows, ≥44px targets, sticky action bar for
   long tasks, nothing hover-only, no sideways scroll.
6. Arabic and English: strings in both message files, logical CSS, `<bdi>` on
   user content, dates through `lib/format.ts`.
7. Light and dark both checked.
8. Screenshots with the preview tool, from `Frontend/`:
   `node tests/ui-preview/shoot.mjs --routes <your routes> --viewports phone,desktop --locales ar,en --themes light,dark`
   with no page errors (a new page needs a route in `tests/ui-preview/entry.jsx`
   and fixtures under `tests/ui-preview/fixtures/`; see its README). Then
   `pnpm run typecheck` and `pnpm run lint`.

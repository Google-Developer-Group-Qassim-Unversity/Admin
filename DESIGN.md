# GDG Qassim admin — design system

A guide for anyone (human or agent) building new UI in this app. The goal is
that a new page looks like it was always here. **When in doubt, copy an existing
page**; this file explains the rules those pages follow.

The identity is **Google Developer Groups**: the four Google brand colours, used
to carry **meaning** (state), not sprinkled for decoration. Type is friendly and
modern; surfaces are calm; the four colours do the talking.

> **Source of truth is the code, not this file.** Tokens live in
> `app/globals.css`; the reusable identity pieces live in
> `components/brand-mark.tsx`, `components/page-header.tsx`,
> `components/status-badge.tsx`, and `components/app-shell.tsx`. If this doc and
> the code disagree, the code wins — and fix this doc.

---

## 1. The four brand colours

Held as literal hex (not oklch) so they reproduce Google's palette exactly. Each
hue has three roles, all exposed as Tailwind utilities via `@theme inline`:

| Role | Utility | Light | Use for |
| --- | --- | --- | --- |
| **base** | `bg-brand-blue` / `text-brand-blue` / `border-brand-blue` | `#4285f4` blue · `#ea4335` red · `#fbbc04` yellow · `#34a853` green | dots, bars, rails, icon strokes — a solid hit of colour |
| **soft** | `bg-brand-blue-soft` | pale tint (`#e8f0fe`, …) | the surface tint behind an icon chip or a status pill |
| **ink** | `text-brand-blue-ink` | AA-safe text (`#1a56c4`, …) | text/icon sitting **on** a `-soft` background |

The rule: **`-soft` background always pairs with `-ink` text** (that pairing is
contrast-checked). Never put base-colour text on white — it fails AA; use `-ink`.

Dark mode swaps in Google's published lighter variants automatically (blue
`#8ab4f8`, red `#f28b82`, yellow `#fdd663`, green `#81c995`; `-soft` become
low-chroma oklch tints). **You never write dark-specific brand colours** — use
the same `brand-*` utility and it adapts.

### Colour = state (the important rule)

The four colours mean specific things. **`components/status-badge.tsx` is the
single source** — never hand-roll a coloured status chip; import from there.

| Colour | Meaning |
| --- | --- |
| 🔵 **blue** | open / informational (e.g. an event open for signup) |
| 🟢 **green** | active / live / done |
| 🟡 **yellow** | waiting on an admin — something a human must act on |
| 🔴 **red** | overdue or failed |
| ⚪ neutral | draft / inactive (muted grey, not a brand colour) |

Exports: `StatusBadge` / `StatusDot` (event status: draft·open·active·closed),
`UrgencyDot` (`waiting`·`overdue`·`info`·`done`). Building a work-queue or a
state indicator? Reach for these first.

---

## 2. Typography

- **Body:** Manrope — `font-sans` (the default, via `--font-latin`).
- **Display:** Outfit — `font-display`. Used for page/section titles. `h1`
  already gets it automatically (see the base layer in `globals.css`); for other
  headings add `font-display`.
- **Numbers that line up** (counts, IDs, times, table figures): add `.tabular`
  (tabular-nums).

Titles are tight: `font-display font-semibold tracking-tight`. Don't introduce
other font families or weights beyond Manrope/Outfit.

---

## 3. Surfaces, radius, dark mode

- Content sits on **cards**: `bg-card border border-border rounded-xl` (or
  `rounded-2xl` for a hero/banner). The page ground (`bg-background`) shows only
  in the gutters.
- Base radius is `0.625rem`; use the `rounded-lg/xl/2xl` scale, not arbitrary
  values.
- **Primary action colour** is Google Blue 600 (`--primary`), already wired to
  `Button`. Use `<Button>` variants; don't recolour buttons by hand.
- **Dark mode is a deep blue-slate, not black** — the whole palette carries a
  hint of the identity. It's driven entirely by tokens, so **if you build with
  the tokens (`bg-card`, `text-muted-foreground`, `brand-*`), dark mode just
  works.** Never hardcode a hex or a `dark:` colour that bypasses a token.
- The ambient page backdrop (corner colour orbs + big faint arcs + dot grid) is
  one component, `AppBackground`, rendered once in the shell. You don't touch it
  per-page; it's already behind everything.

---

## 4. The identity pieces (reuse, don't reinvent)

From `components/brand-mark.tsx`:

- **`BrandMark`** — the broken four-colour ring. The app logo; already in the
  shell. Rarely needed elsewhere.
- **`BrandArcs`** — the concentric quarter-arcs. The signature decorative motif.
  Belongs bleeding off a **corner** of a hero/banner, large and low-opacity,
  never inline with text. Mirrors in RTL via `rtl:-scale-x-100`.
- **`BrandRail`** — the four-colour hairline. Caps the top edge of cards
  and banners. `orientation="vertical"` for a leading-edge accent.
- **`AppBackground`** — the ambient backdrop (shell-level only).

From `components/page-header.tsx`:

- **`PageHeader`** — the arc-decorated banner every top-level page opens with.
  Props: `title`, `description?`, `icon?` (match the page's sidebar icon),
  `children` (action buttons). **Every new top-level page should use it.**

From `components/dashboard/`:

- **`StatTile`** — a metric card with a tone (`blue`/`green`/`yellow`/`red`/
  `neutral`) that colours its accent rail + icon chip. Use for KPI numbers.

Layout:

- **`AppShell`** wraps everything (sidebar + topbar + ⌘K palette). New routes get
  it automatically. A new nav entry goes in `NAV_GROUPS` (`app-shell.tsx`) under
  the right group (Operate / People / Engage / System) with a Lucide icon; add
  the matching label to `messages/{en,ar}.json` under `nav`. Full-bleed routes
  (projector, access-denied) are listed in `MINIMAL_ROUTES`.

---

## 5. Page recipe (copy this shape)

```tsx
export default function ThingPage() {
  const t = useTranslations("thing");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={SomeIcon}>
        <Button asChild>
          <Link href="/thing/create">{t("create")}</Link>
        </Button>
      </PageHeader>

      {/* KPI row (optional) */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Icon} tone="blue" label={…} value={…} />
      </div>

      {/* content in bg-card border rounded-xl surfaces */}
    </div>
  );
}
```

Icons are **Lucide** (`lucide-react`), ~`h-4 w-4` inline. Don't mix icon sets.

---

## 6. Non-negotiables

- **Tailwind class strings must be complete literals.** Tailwind v4 scans source
  text — it never sees `` `bg-brand-${hue}` ``. Map tones to **full class
  strings** (see `stat-tile.tsx` / `status-badge.tsx`) instead of building class
  names dynamically.
- **RTL is first-class.** Use logical properties everywhere: `ms/me`, `ps/pe`,
  `start/end`, `text-start`. Never `ml/mr/left/right`. Flip directional glyphs
  with `rtl:-scale-x-100`.
- **i18n, always.** No hardcoded user-facing strings — everything through
  `next-intl` (`useTranslations`). Add keys to **both** `messages/en.json` and
  `messages/ar.json`; keep them in sync (equal key counts) and use ICU plurals
  where counts appear.
- **Colour must mean something.** If you're about to use a brand colour, ask
  which *state* it represents. If the answer is "just looks nice," use a neutral
  surface instead — decoration is `AppBackground`'s job, already handled.
- **Theme via tokens only.** `bg-card`, `text-muted-foreground`, `border-border`,
  `brand-*`. A raw hex or a `dark:` override that dodges a token is a bug.

---

## 7. Quick reference

| Want | Use |
| --- | --- |
| Page title banner | `PageHeader` (arcs + icon + actions) |
| Status chip / dot | `StatusBadge` / `StatusDot` / `UrgencyDot` |
| KPI number | `StatTile` (tone) |
| A hit of brand colour | `bg-brand-{hue}` (base) — only if it encodes state |
| Tinted chip background | `bg-brand-{hue}-soft` + `text-brand-{hue}-ink` |
| A card surface | `bg-card border border-border rounded-xl` |
| Decorative flourish | `BrandArcs` off a corner, low opacity |
| Display heading | `font-display font-semibold tracking-tight` |
| Aligned numbers | `.tabular` |

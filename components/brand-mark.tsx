/**
 * The GDG-on-campus marks.
 *
 * All three draw from the four brand CSS variables rather than literal hex, so
 * they pick up the lighter dark-theme variants automatically - the poster
 * colours go muddy on a dark ground.
 */

/** The broken four-colour ring. Sits in the sidebar head and the mobile drawer. */
export function BrandMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 3 H19 A4 4 0 0 1 23 7 V9" stroke="var(--brand-red)" strokeWidth="3" strokeLinecap="round" />
      <path d="M23 13 V17 A4 4 0 0 1 19 21 H17" stroke="var(--brand-yellow)" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 21 H7 A4 4 0 0 1 3 17 V15" stroke="var(--brand-green)" strokeWidth="3" strokeLinecap="round" />
      <path d="M3 11 V7 A4 4 0 0 1 7 3 H9" stroke="var(--brand-blue)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The concentric quarter-arcs. Decorative, and large - it belongs bleeding off
 * the corner of a hero, never inline with text.
 */
export function BrandArcs({ size = 420, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M100 20a80 80 0 0 1 80 80" stroke="var(--brand-blue)" strokeWidth="10" strokeLinecap="round" />
      <path d="M100 44a56 56 0 0 1 56 56" stroke="var(--brand-red)" strokeWidth="10" strokeLinecap="round" />
      <path d="M100 68a32 32 0 0 1 32 32" stroke="var(--brand-yellow)" strokeWidth="10" strokeLinecap="round" />
      <path d="M180 100a80 80 0 0 1-28 60.8" stroke="var(--brand-green)" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The four-colour hairline. Caps the very top of the app and the top edge of
 * every card; pass `orientation="vertical"` for a leading-edge accent.
 */
export function BrandRail({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const shape = orientation === "vertical" ? "flex-col h-full w-1" : "h-1 w-full";
  return (
    <div className={`flex shrink-0 ${shape} ${className ?? ""}`} aria-hidden="true">
      <span className="flex-1 bg-brand-blue" />
      <span className="flex-1 bg-brand-red" />
      <span className="flex-1 bg-brand-yellow" />
      <span className="flex-1 bg-brand-green" />
    </div>
  );
}

/**
 * The ambient page backdrop. One fixed, non-interactive layer that sits behind
 * the whole app: soft glowing brand orbs drifting in from the corners, two
 * large faint arc marks echoing the hero motif, and a fine dot grid for
 * texture. Every piece is tuned twice - quiet over the light paper, brighter
 * against the dark blue-slate - so the gutters never read as blank.
 */
export function AppBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Glowing colour orbs, blurred into washes. */}
      <div className="bg-brand-blue absolute -top-40 -end-40 h-[36rem] w-[36rem] rounded-full opacity-[0.13] blur-[120px] dark:opacity-30" />
      <div className="bg-brand-green absolute -bottom-48 -start-40 h-[38rem] w-[38rem] rounded-full opacity-[0.11] blur-[130px] dark:opacity-25" />
      <div className="bg-brand-yellow absolute top-1/3 start-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full opacity-[0.10] blur-[120px] dark:opacity-[0.14]" />
      <div className="bg-brand-red absolute -bottom-32 end-1/4 h-[22rem] w-[22rem] rounded-full opacity-[0.07] blur-[120px] dark:opacity-[0.12]" />

      {/* Big faint arcs - the hero mark, blown up and bled off two corners. */}
      <BrandArcs
        size={660}
        className="absolute -top-52 -end-44 opacity-[0.10] rtl:-scale-x-100 dark:opacity-[0.16]"
      />
      <BrandArcs
        size={520}
        className="absolute -bottom-60 -start-44 rotate-180 opacity-[0.08] rtl:-scale-x-100 dark:opacity-[0.13]"
      />

      {/* Dot grid over the top: grey-blue on light, faint white on dark. */}
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(oklch(0.45_0.04_264/0.10)_1px,transparent_1.5px)] [background-size:24px_24px] dark:[background-image:radial-gradient(oklch(1_0_0/0.045)_1px,transparent_1.5px)]" />
    </div>
  );
}

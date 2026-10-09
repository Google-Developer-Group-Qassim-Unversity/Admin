import Image from "next/image";

/** public/gdg.png is 362×200. */
const LOGO_RATIO = 362 / 200;

/** The GDG chevrons: the app's logo. */
export function GdgLogo({ height = 24, className, priority }: { height?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/gdg.png"
      alt="GDG"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      priority={priority}
      className={className}
    />
  );
}

/** @deprecated The previous design's ring mark. Renders the GDG logo; use `GdgLogo`. */
export function BrandMark({ size = 26, className }: { size?: number; className?: string }) {
  return <GdgLogo height={Math.round(size * 0.8)} className={className} />;
}

/** @deprecated The previous design's arcs. Renders nothing; delete the call. */
export function BrandArcs(_props: { size?: number; className?: string }) {
  return null;
}

/** @deprecated The previous design's four-colour rail. Renders nothing; delete the call. */
export function BrandRail(_props: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return null;
}

/** @deprecated The previous design's ambient backdrop. The wall texture now lives on `body`. */
export function AppBackground() {
  return null;
}

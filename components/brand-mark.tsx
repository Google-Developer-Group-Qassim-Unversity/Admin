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

import type { LucideIcon } from "lucide-react";

import { BrandArcs } from "@/components/brand-mark";

/**
 * The arc-decorated banner that heads every top-level page. It carries the same
 * motif as the dashboard hero - the concentric brand arcs bleeding off the
 * trailing corner, flipping with the locale, over a soft brand wash - at a
 * lighter weight suited to a secondary page. Action buttons go in `children`
 * and sit on the trailing side.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  children,
  arcSize = 300,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  arcSize?: number;
}) {
  return (
    <section className="bg-card brand-hero border-border relative overflow-hidden rounded-2xl border px-4 py-4 sm:px-6 sm:py-5">
      <BrandArcs
        size={arcSize}
        className="pointer-events-none absolute -top-24 -end-12 opacity-35 max-sm:-top-20 max-sm:-end-16 max-sm:size-[200px] rtl:-scale-x-100"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="bg-brand-blue-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11">
              <Icon className="text-brand-blue-ink h-5 w-5" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
            <h1 className="font-display text-[22px] leading-tight font-semibold tracking-tight text-balance sm:text-[28px]">
              {title}
            </h1>
            {description ? (
              <p className="text-muted-foreground text-[13px] text-pretty sm:text-[13.5px]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {/* On a phone the actions take a full-width row of equal buttons. */}
        {children ? (
          <div className="flex w-full flex-wrap items-center gap-2 *:flex-1 sm:w-auto sm:*:flex-none">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

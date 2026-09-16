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
    <section className="bg-card brand-hero border-border relative overflow-hidden rounded-2xl border px-5 py-5 sm:px-6">
      <BrandArcs
        size={arcSize}
        className="pointer-events-none absolute -top-24 -end-12 opacity-35 rtl:-scale-x-100"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="bg-brand-blue-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Icon className="text-brand-blue-ink h-5 w-5" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">
              {title}
            </h1>
            {description ? (
              <p className="text-muted-foreground text-[13.5px] text-pretty">{description}</p>
            ) : null}
          </div>
        </div>

        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </section>
  );
}

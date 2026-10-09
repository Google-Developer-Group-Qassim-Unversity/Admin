import type { LucideIcon } from "lucide-react";

import { Plate } from "@/components/najdi";

/**
 * The head of every top-level page: the title in the kufic display face on the
 * wall itself, no banner card, closed by a one-pixel ink rule. Actions sit on
 * the trailing side; on a phone they take a full-width row of equal buttons.
 * `icon` is the page's nav icon on a small umber plate.
 */
export function PageHeader({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-foreground flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? <Plate tone="umber" icon={icon} className="max-sm:hidden" /> : null}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[26px] leading-tight font-semibold text-balance sm:text-[30px]">{title}</h1>
          {description ? <p className="text-ink-2 max-w-[70ch] text-sm text-pretty">{description}</p> : null}
        </div>
      </div>

      {children ? (
        <div className="flex w-full flex-wrap items-center gap-2 *:flex-1 sm:w-auto sm:*:flex-none">{children}</div>
      ) : null}
    </header>
  );
}

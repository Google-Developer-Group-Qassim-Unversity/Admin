import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Search plus a few select filters. On a phone the search takes the full
 * width and the filters share a row beneath it; from sm up everything sits on
 * one wrapping line with `trailing` (a result count, a column toggle) pushed
 * to the end.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  trailing,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** The filter controls - selects, toggles. Each stretches on a phone. */
  children?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <div className="relative min-w-0 w-full sm:flex-1 sm:basis-72">
        <Search className="text-ink-2 pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-9"
        />
      </div>
      {children ? (
        <div className="flex min-w-0 flex-wrap gap-2 *:min-w-0 *:flex-1 sm:*:flex-none">
          {children}
        </div>
      ) : null}
      {trailing ? (
        <div className="text-ink-2 flex items-center flex-wrap justify-between gap-3 text-[14px] sm:ms-auto">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

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
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-card ps-9"
        />
      </div>
      {children ? (
        <div className="grid auto-cols-fr grid-flow-col gap-2 *:w-full sm:flex sm:*:w-auto">
          {children}
        </div>
      ) : null}
      {trailing ? (
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-[13px] sm:ms-auto">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

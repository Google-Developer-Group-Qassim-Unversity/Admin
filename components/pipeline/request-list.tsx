"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { StageBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventRequestSummary } from "@/lib/pipeline-types";

/** A compact list of requests, each linking to its page: title and stage, then who and when. */
export function RequestList({
  items,
  isPending,
  empty,
}: {
  items: EventRequestSummary[] | undefined;
  isPending: boolean;
  empty: string;
}) {
  const t = useTranslations("pipeline.requests");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (!items?.length) return <p className="text-muted-foreground py-6 text-center text-sm text-balance">{empty}</p>;

  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/pipeline/requests/${r.id}`}
            className="hover:bg-muted/60 focus-visible:bg-muted/60 group flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none transition-colors"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {r.title || t("untitled", { id: r.id })}
                </span>
                <StageBadge stage={r.stage} className="shrink-0" />
              </div>
              <span className="text-muted-foreground truncate text-xs">
                {departmentName(r.department)}
                {" · "}
                <span className="tabular">{r.start_date ? formatRange(r.start_date, r.end_date) : t("noDates")}</span>
              </span>
            </div>
            <ChevronRight className="text-muted-foreground/60 group-hover:text-foreground h-4 w-4 shrink-0 transition-colors rtl:-scale-x-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

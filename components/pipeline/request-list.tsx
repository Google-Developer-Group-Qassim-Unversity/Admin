"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useDepartmentName } from "@/components/pipeline/shared";
import { StageBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventRequestSummary } from "@/lib/pipeline-types";

/** A compact list of requests, each linking to its page. */
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

  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (!items?.length) return <p className="text-muted-foreground text-sm">{empty}</p>;

  return (
    <ul className="divide-border border-border divide-y rounded-lg border">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/pipeline/requests/${r.id}`}
            className="hover:bg-muted/60 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 transition-colors"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title || t("untitled", { id: r.id })}</span>
            <span className="text-muted-foreground text-xs">{departmentName(r.department)}</span>
            <span className="text-muted-foreground tabular text-xs">
              {r.start_date ? `${r.start_date} → ${r.end_date}` : t("noDates")}
            </span>
            <StageBadge stage={r.stage} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

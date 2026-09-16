"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { BrandRail } from "@/components/brand-mark";
import { UrgencyDot } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttention, type AttentionItem } from "@/hooks/use-attention";

function QueueRow({ item }: { item: AttentionItem }) {
  const t = useTranslations("dashboard.queue");

  return (
    <li className="border-border/60 flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <UrgencyDot urgency={item.urgency} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold">
          {t(`${item.kind}.title`, { count: item.count ?? 0, days: item.days })}
        </span>
        <span className="text-muted-foreground truncate text-[11.5px]">
          {item.event.name} · {t(`${item.kind}.detail`, { days: item.days })}
        </span>
      </div>

      <Link
        href={item.href}
        className="bg-muted hover:bg-accent hover:text-accent-foreground flex h-7 shrink-0 items-center rounded-md px-3 text-xs font-semibold transition-colors"
      >
        {t(`${item.kind}.action`)}
      </Link>
    </li>
  );
}

/**
 * The first thing on the dashboard: everything waiting on a human, ranked by
 * how much it hurts to leave it. Empty is a good state, and says so.
 */
export function AttentionQueue() {
  const t = useTranslations("dashboard");
  const { items, isPending } = useAttention();

  return (
    <section className="bg-card border-border flex flex-col overflow-hidden rounded-xl border">
      <BrandRail />
      <header className="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <h3 className="font-display text-sm font-bold tracking-tight">{t("attention")}</h3>
        {!isPending && items.length > 0 && (
          <span className="bg-muted text-muted-foreground tabular rounded-full px-2 py-0.5 text-[11px] font-semibold">
            {items.length}
          </span>
        )}
      </header>

      {isPending ? (
        <div className="flex flex-col gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span className="bg-brand-green-soft flex h-10 w-10 items-center justify-center rounded-full">
            <CheckCircle2 className="text-brand-green-ink h-5 w-5" />
          </span>
          <p className="text-sm font-semibold">{t("allClearTitle")}</p>
          <p className="text-muted-foreground max-w-xs text-[12.5px]">{t("allClearBody")}</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <QueueRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

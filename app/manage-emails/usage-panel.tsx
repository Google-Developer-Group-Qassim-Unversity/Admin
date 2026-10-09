"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmailDashboardStats } from "@/lib/api";
import type { EmailDashboardStats } from "@/lib/api-types";
import { useTranslations } from "next-intl";

/** One label and its count on a ruled line, with a hairline showing its share. */
function UsageRow({ label, count, max, title }: { label: string; count: number; max?: number; title?: string }) {
  return (
    <div className="border-rule flex flex-col gap-1.5 border-b py-2 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-ink-2 min-w-0 truncate text-[13px]" title={title} dir="auto">
          {label}
        </dt>
        <dd className="tabular shrink-0 text-sm font-bold">{count.toLocaleString()}</dd>
      </div>
      {max ? (
        <span aria-hidden="true" className="bg-sunk block h-1 overflow-hidden rounded-[1px]">
          <span className="bg-adobe block h-full" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} />
        </span>
      ) : null}
    </div>
  );
}

export function UsagePanel() {
  const t = useTranslations("manageEmails.usage");
  const { getToken } = useAuth();
  const [stats, setStats] = React.useState<EmailDashboardStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const result = await getEmailDashboardStats(1, getToken);
      if (!cancelled && result.success) {
        setStats(result.data);
      }
      setIsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [getToken, refreshKey]);

  const typeLabels: Record<string, string> = {
    "event-certificate": t("types.eventCertificate"),
    "manual-certificate": t("types.manualCertificate"),
    acceptance: t("types.acceptance"),
    event_announcement: t("types.announcement"),
    blast: t("types.blast"),
  };

  const maxTypeCount = stats ? Math.max(...Object.values(stats.by_type), 1) : 1;

  return (
    <section className="bg-card ring-rule flex flex-col gap-3 rounded-xl px-4 pt-3 pb-4 ring-1" aria-labelledby="email-usage-title">
      <div className="border-foreground flex items-center justify-between gap-2 border-b pb-2">
        <h2 id="email-usage-title" className="flex items-baseline gap-2 text-base font-bold">
          {t("title")}
          <span className="text-ink-2 text-xs font-medium">{t("last24h")}</span>
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isLoading}
          aria-label={t("refresh")}
        >
          <RefreshCw className={isLoading ? "animate-spin motion-reduce:animate-none" : ""} />
        </Button>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : stats ? (
        <>
          <dl className="flex items-baseline justify-between gap-3">
            <dt className="text-sm font-bold">{t("total")}</dt>
            <dd className="tabular text-[21px] leading-none font-bold">{stats.total_24h.toLocaleString()}</dd>
          </dl>
          <div className="flex flex-col">
            <p className="text-ink-2 text-xs font-bold">{t("sentPerAddress")}</p>
            <dl>
              {Object.entries(stats.addresses)
                .reverse()
                .map(([addr, data]) => (
                  <UsageRow key={addr} label={addr} title={addr} count={data.usage} />
                ))}
            </dl>
          </div>
          <div className="flex flex-col">
            <p className="text-ink-2 text-xs font-bold">{t("byType")}</p>
            {Object.keys(stats.by_type).length === 0 ? (
              <p className="text-ink-2 py-2 text-center text-xs">{t("noData")}</p>
            ) : (
              <dl>
                {Object.entries(stats.by_type).map(([type, count]) => (
                  <UsageRow key={type} label={typeLabels[type] ?? type} count={count} max={maxTypeCount} />
                ))}
              </dl>
            )}
          </div>
        </>
      ) : (
        <p className="text-ink-2 text-[13px]">{t("loadFailed")}</p>
      )}
    </section>
  );
}

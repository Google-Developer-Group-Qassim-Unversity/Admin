"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmailDashboardStats } from "@/lib/api";
import type { EmailDashboardStats } from "@/lib/api-types";
import { useTranslations } from "next-intl";

function AddressUsageRow({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground truncate min-w-0" title={label}>
        {label}
      </p>
      <p className="text-sm font-bold shrink-0">{value}</p>
    </div>
  );
}

function TypeBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
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
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("title")} <span className="text-xs text-muted-foreground/50">·</span> <span className="text-muted-foreground font-normal text-xs">{t("last24h")}</span></CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={() => setRefreshKey((k) => k + 1)} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : stats ? (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("sentPerAddress")}</p>
              {Object.entries(stats.addresses).reverse().map(([addr, data]) => (
                <AddressUsageRow key={addr} value={data.usage} label={addr} />
              ))}
            </div>
            <div className="pt-2">
              <p className="text-xs font-medium mb-2">{t("byType")}</p>
              <div className="space-y-2.5">
                {Object.entries(stats.by_type).map(([type, count]) => (
                  <TypeBar key={type} label={typeLabels[type] ?? type} count={count} max={maxTypeCount} />
                ))}
                {Object.keys(stats.by_type).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">{t("noData")}</p>
                )}
              </div>
            </div>
            <div className="pt-1 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("total")}</span>
                <span className="font-medium text-foreground">{stats.total_24h}</span>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

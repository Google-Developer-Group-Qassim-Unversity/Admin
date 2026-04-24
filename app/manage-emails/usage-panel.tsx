"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmailDashboardStats } from "@/lib/api";
import type { EmailDashboardStats } from "@/lib/api-types";

function CircularProgress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = pct > 0.8 ? "stroke-red-500" : pct > 0.5 ? "stroke-amber-500" : "stroke-emerald-500";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" className="stroke-muted" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          className={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center -mt-[58px] mb-[30px]">
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground">/ {max}</p>
      </div>
      <p className="text-[10px] text-muted-foreground text-center truncate max-w-[100px]" title={label}>
        {label}
      </p>
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
    "event-certificate": "Event Certificates",
    "manual-certificate": "Manual Certificates",
    acceptance: "Acceptance",
    event_announcement: "Announcements",
  };

  const maxTypeCount = stats ? Math.max(...Object.values(stats.by_type), 1) : 1;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Usage <span className="text-xs text-muted-foreground/50">·</span> <span className="text-muted-foreground font-normal text-xs">Last 24h</span></CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={() => setRefreshKey((k) => k + 1)} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-center gap-6">
              <Skeleton className="h-[100px] w-[88px] rounded-lg" />
              <Skeleton className="h-[100px] w-[88px] rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : stats ? (
          <>
            <div className="flex justify-center gap-6">
              {Object.entries(stats.addresses).reverse().map(([addr, data]) => (
                <CircularProgress key={addr} value={data.usage} max={data.threshold} label={addr} />
              ))}
            </div>
            <div className="pt-2">
              <p className="text-xs font-medium mb-2">Usage by email type</p>
              <div className="space-y-2.5">
                {Object.entries(stats.by_type).map(([type, count]) => (
                  <TypeBar key={type} label={typeLabels[type] ?? type} count={count} max={maxTypeCount} />
                ))}
                {Object.keys(stats.by_type).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No usage data</p>
                )}
              </div>
            </div>
            <div className="pt-1 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total</span>
                <span className="font-medium text-foreground">{stats.total_24h}</span>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

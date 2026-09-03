"use client";

import * as React from "react";
import { CalendarRange, ChevronRight, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResetLeaderboardCache } from "@/hooks/use-cache";
import { RequireRole } from "@/hooks/use-rbac";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("settingsPage");
  const { getToken } = useAuth();
  const resetCache = useResetLeaderboardCache(getToken);

  const handleResetCache = async () => {
    try {
      await resetCache.mutateAsync();
      toast.success(t("resetSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("resetFailed"));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            {t("cacheTitle")}
          </CardTitle>
          <CardDescription>
            {t("cacheDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{t("resetCache")}</p>
              <p className="text-sm text-muted-foreground">
                {t("resetCacheHint")}
              </p>
            </div>
            <Button
              onClick={handleResetCache}
              disabled={resetCache.isPending}
              variant="destructive"
            >
              <RotateCcw className={`h-4 w-4 me-2 ${resetCache.isPending ? "animate-spin" : ""}`} />
              {resetCache.isPending ? t("resetting") : t("resetCacheButton")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RequireRole role="super_admin">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarRange className="h-5 w-5 text-primary" />
              </div>
              {t("semestersTitle")}
            </CardTitle>
            <CardDescription>
              {t("semestersDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{t("manageSemesters")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("manageSemestersHint")}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/settings/semesters">
                  {t("open")}
                  <ChevronRight className="h-4 w-4 ms-2 rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </RequireRole>
    </div>
  );
}

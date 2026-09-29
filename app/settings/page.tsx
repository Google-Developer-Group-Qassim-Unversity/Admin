"use client";

import * as React from "react";
import { CalendarRange, ChevronRight, ExternalLink, FileText, Loader2, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResetLeaderboardCache } from "@/hooks/use-cache";
import { RequireRole } from "@/hooks/use-rbac";
import { useTranslations } from "next-intl";

function TemplateFormCard() {
  const t = useTranslations("settingsPage");
  const { data, isLoading, error } = useQuery({
    queryKey: ["settings", "template-form"],
    queryFn: async () => {
      const res = await fetch("/api/settings/template-form");
      if (!res.ok) throw new Error("Failed to load template form link");
      return res.json() as Promise<{ url: string }>;
    },
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-brand-blue-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <FileText className="text-brand-blue-ink h-5 w-5" />
          </div>
          {t("templateFormTitle")}
        </CardTitle>
        <CardDescription>
          {t("templateFormDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-none">{t("templateForm")}</p>
            <p className="text-sm text-muted-foreground">
              {error ? t("templateFormLoadFailed") : t("templateFormHint")}
            </p>
          </div>
          {data?.url ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={data.url} target="_blank" rel="noopener noreferrer">
                {t("openTemplateForm")}
                <ExternalLink className="h-4 w-4 ms-2" />
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("openTemplateForm")
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Settings} />

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-brand-blue-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Settings className="text-brand-blue-ink h-5 w-5" />
            </div>
            {t("cacheTitle")}
          </CardTitle>
          <CardDescription>
            {t("cacheDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium leading-none">{t("resetCache")}</p>
              <p className="text-sm text-muted-foreground">
                {t("resetCacheHint")}
              </p>
            </div>
            <Button
              onClick={handleResetCache}
              disabled={resetCache.isPending}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              <RotateCcw className={`h-4 w-4 me-2 ${resetCache.isPending ? "animate-spin" : ""}`} />
              {resetCache.isPending ? t("resetting") : t("resetCacheButton")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RequireRole role="super_admin">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="bg-brand-blue-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <CalendarRange className="text-brand-blue-ink h-5 w-5" />
              </div>
              {t("semestersTitle")}
            </CardTitle>
            <CardDescription>
              {t("semestersDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium leading-none">{t("manageSemesters")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("manageSemestersHint")}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/settings/semesters">
                  {t("open")}
                  <ChevronRight className="h-4 w-4 ms-2 rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <TemplateFormCard />
      </RequireRole>
    </div>
  );
}

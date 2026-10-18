"use client";

import {
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  ExternalLink,
  FileText,
  HardDrive,
  Loader2,
  RotateCcw,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Plate } from "@/components/najdi";
import { useDriveStorageQuota } from "@/hooks/use-event";
import { useResetLeaderboardCache } from "@/hooks/use-cache";
import { useAccess } from "@/hooks/use-access";
import { formatBytes } from "@/lib/utils";
import { useTranslations } from "next-intl";

/** One setting as a row on the wall: its plate, what it does, and the action. */
function SettingRow({
  icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="border-rule flex flex-col gap-3 border-b px-1 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Plate tone="neutral" icon={icon} />
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] leading-snug font-bold">{title}</p>
          <p className="text-ink-2 max-w-[65ch] text-[13.5px]">{hint}</p>
        </div>
      </div>
      <div className="flex shrink-0 *:w-full sm:*:w-auto">{children}</div>
    </li>
  );
}

function TemplateFormRow() {
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
    <SettingRow
      icon={FileText}
      title={t("templateFormTitle")}
      hint={
        <>
          {t("templateFormDescription")}{" "}
          <span className={error ? "text-door-madder-ink" : undefined}>
            {error ? t("templateFormLoadFailed") : t("templateFormHint")}
          </span>
        </>
      }
    >
      {data?.url ? (
        <Button asChild variant="outline">
          <a href={data.url} target="_blank" rel="noopener noreferrer">
            {t("openTemplateForm")}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("openTemplateForm")}
        </Button>
      )}
    </SettingRow>
  );
}

function DriveStorageRow() {
  const t = useTranslations("settingsPage");
  const { data, isLoading, error } = useDriveStorageQuota();

  const isConfigured = Boolean(data?.configured);
  const usage = data?.usage;
  const limit = data?.limit;
  const percentage = data?.usage_percentage;
  const isWarning = Boolean(percentage && percentage >= 80);

  const formattedUsage = formatBytes(usage ?? 0);
  const formattedLimit = limit != null ? formatBytes(limit) : null;

  return (
    <SettingRow
      icon={HardDrive}
      title={t("driveStorageTitle")}
      hint={
        <>
          {t("driveStorageDescription")}{" "}
          <span className="text-muted-foreground">{t("driveStorageHint")}</span>
        </>
      }
    >
      {isLoading ? (
        <Badge variant="outline" className="gap-1.5 py-1 px-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>...</span>
        </Badge>
      ) : !isConfigured || error || usage == null ? (
        <Badge variant="outline" className="text-muted-foreground py-1 px-3">
          {t("driveStorageUnconfigured")}
        </Badge>
      ) : (
        <Badge
          variant={isWarning ? "ochre" : "secondary"}
          className={`gap-1.5 py-1 px-3 tabular text-xs ${
            isWarning ? "border-door-ochre-ink/30 font-semibold" : "font-normal"
          }`}
        >
          {isWarning ? <AlertTriangle className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
          <span>
            {formattedLimit
              ? t("driveStorageUsage", {
                  used: formattedUsage,
                  limit: formattedLimit,
                  percentage: Math.round(percentage ?? 0),
                })
              : t("driveStorageUnlimited", { used: formattedUsage })}
          </span>
        </Badge>
      )}
    </SettingRow>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settingsPage");
  const { getToken } = useAuth();
  const resetCache = useResetLeaderboardCache(getToken);
  const { can } = useAccess();

  const handleResetCache = async () => {
    try {
      await resetCache.mutateAsync();
      toast.success(t("resetSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("resetFailed"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Settings} />

      <ul className="-mt-6 flex flex-col">
        {can("semesters.manage") ? (
          <SettingRow
            icon={CalendarRange}
            title={t("semestersTitle")}
            hint={`${t("semestersDescription")} ${t("manageSemestersHint")}`}
          >
            <Button asChild>
              <Link href="/settings/semesters">
                {t("manageSemesters")}
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
          </SettingRow>
        ) : null}

        {can("settings.template_form") ? <TemplateFormRow /> : null}

        <DriveStorageRow />

        {can("cache.reset") ? (
          <SettingRow icon={RotateCcw} title={t("cacheTitle")} hint={`${t("cacheDescription")} ${t("resetCacheHint")}`}>
            <Button onClick={handleResetCache} disabled={resetCache.isPending} variant="destructive">
              <RotateCcw className={`h-4 w-4 ${resetCache.isPending ? "animate-spin motion-reduce:animate-none" : ""}`} />
              {resetCache.isPending ? t("resetting") : t("resetCacheButton")}
            </Button>
          </SettingRow>
        ) : null}
      </ul>
    </div>
  );
}

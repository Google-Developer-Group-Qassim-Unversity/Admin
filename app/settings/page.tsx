"use client";

import {
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  ExternalLink,
  FileText,
  HardDrive,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Plate } from "@/components/najdi";
import { GOOGLE_AUTH_TONE, StatePill } from "@/components/status-badge";
import { useDriveStorageQuota } from "@/hooks/use-event";
import { useResetLeaderboardCache } from "@/hooks/use-cache";
import { useAccess } from "@/hooks/use-access";
import { useApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { isolate, useFormatters } from "@/lib/format";
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
    <li className="border-rule flex flex-col gap-4 border-b px-1 py-5 last:border-b-0 sm:flex-row sm:items-center">
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

function GoogleFormsConnectionRow() {
  const t = useTranslations("settingsPage");
  const api = useApi();
  const fmt = useFormatters();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["settings", "google-forms-auth"],
    queryFn: () => api.forms.googleAuthStatus(),
    staleTime: 30_000,
  });

  const recheck = useMutation({
    mutationFn: () => api.forms.googleAuthStatus(true),
    onSuccess: (status) => {
      queryClient.setQueryData(["settings", "google-forms-auth"], status);
    },
    onError: (err) => {
      toast.error(errorMessage(err, t("googleFormsAuthLoadFailed")));
    },
  });

  const startAuth = useMutation({
    mutationFn: () => api.forms.startGoogleAuth(),
    onSuccess: ({ authorization_url }) => {
      window.location.assign(authorization_url);
    },
    onError: (err) => {
      toast.error(errorMessage(err, t("googleFormsAuthStartFailed")));
    },
  });

  const stateKey: "connected" | "unreachable" | "expired" = data?.valid
    ? "connected"
    : data?.reason === "unreachable"
      ? "unreachable"
      : "expired";

  const statusLabel =
    stateKey === "connected"
      ? t("googleFormsAuthConnected")
      : stateKey === "unreachable"
        ? t("googleFormsAuthUnreachable")
        : t("googleFormsAuthExpired");

  const unavailableHint =
    data && !data.can_reconnect
      ? data.reconnect_unavailable_reason === "missing_google_client"
        ? t("googleFormsAuthMissingClient")
        : t("googleFormsAuthMissingEncryptionKey")
      : null;

  const connectedMeta =
    data?.connected_at && data.connected_by_name
      ? t("googleFormsAuthConnectedMeta", {
          date: fmt.dateTime(data.connected_at),
          name: isolate(data.connected_by_name),
        })
      : data?.connected_at
        ? t("googleFormsAuthConnectedAt", { date: fmt.dateTime(data.connected_at) })
        : null;

  return (
    <SettingRow
      icon={Link2}
      title={t("googleFormsAuthTitle")}
      hint={
        <span className="flex flex-col gap-1.5">
          <span>{t("googleFormsAuthDescription")}</span>
          {error ? (
            <span className="text-door-madder-ink">{t("googleFormsAuthLoadFailed")}</span>
          ) : data ? (
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <StatePill tone={GOOGLE_AUTH_TONE[stateKey]}>{statusLabel}</StatePill>
              {data.account_email ? (
                <span>
                  {t(data.valid ? "googleFormsAuthConnectedAs" : "googleFormsAuthLastConnectedAs", {
                    email: isolate(data.account_email),
                  })}
                </span>
              ) : null}
              {connectedMeta ? <span className="text-ink-3">{connectedMeta}</span> : null}
            </span>
          ) : null}
          {data && !data.valid && data.reason !== "unreachable" ? (
            <span className="text-door-madder-ink">{t("googleFormsAuthExpiredHint")}</span>
          ) : null}
          {data?.source === "env" && data.can_reconnect ? (
            <span className="text-ink-3">{t("googleFormsAuthUsingEnv")}</span>
          ) : null}
          {unavailableHint ? <span className="text-ink-3">{unavailableHint}</span> : null}
        </span>
      }
    >
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => recheck.mutate()}
          disabled={isLoading || isFetching || recheck.isPending || startAuth.isPending}
          aria-label={t("googleFormsAuthRecheck")}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${recheck.isPending || isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </Button>
        <Button
          type="button"
          variant={data?.valid ? "outline" : "default"}
          className="flex-1 sm:flex-none"
          onClick={() => startAuth.mutate()}
          disabled={isLoading || !data?.can_reconnect || startAuth.isPending}
        >
          {startAuth.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              {t("googleFormsAuthConnecting")}
            </>
          ) : data?.valid ? (
            t("googleFormsAuthReconnectButton")
          ) : (
            t("googleFormsAuthConnectButton")
          )}
        </Button>
      </div>
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

      <ul className="panel flex flex-col">
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

        {can("forms.admin") ? <GoogleFormsConnectionRow /> : null}

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

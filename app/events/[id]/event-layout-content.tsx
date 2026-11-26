"use client";

import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import * as React from "react";
import {
  ArrowLeft,
  Info,
  Link2,
  FolderUp,
  Users,
  ClipboardCheck,
  Pencil,
  CalendarX,
  CalendarDays,
  Globe,
  MapPin,
  Building2,
  Copy,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { EventQrCodeDialog } from "@/components/event-qr-code-dialog";
import { RegistrationBadge, StatusBadge } from "@/components/status-badge";
import { useDepartmentName, useEventDates } from "@/components/event-bits";
import { isCustomEvent, resolveLifecycleState } from "@/lib/event-lifecycle";
import { getEffectiveEndDate, parseLocalDateTime } from "@/lib/utils";
import { config } from "@/lib/config";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { EventProvider } from "@/contexts/event-context";
import { useEvent } from "@/hooks/use-event";
import { ApiRequestError } from "@/lib/api/errors";
import { useTranslations } from "next-intl";

const TAB_ITEMS = [
  { value: "info", key: "info", icon: Info, path: "" },
  { value: "content", key: "content", icon: FolderUp, path: "/content" },
  { value: "manage", key: "manage", icon: Link2, path: "/manage" },
  { value: "responses", key: "responses", icon: Users, path: "/responses" },
  { value: "attendance", key: "attendance", icon: ClipboardCheck, path: "/attendance" },
  { value: "edit", key: "edit", icon: Pencil, path: "/edit" },
] as const;

/** Brings the active tab into view when the strip is scrolled sideways. */
function scrollIntoViewOnMount(el: HTMLAnchorElement | null) {
  el?.scrollIntoView({ block: "nearest", inline: "center" });
}

function TabSkeleton({ w }: { w: string }) {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-4" />
      <Skeleton className={`h-4 ${w}`} />
    </div>
  );
}

export function EventLayoutContent({ eventId, children }: { eventId: string; children: React.ReactNode }) {
  const t = useTranslations("eventLayout");
  const tp = useTranslations("publishItem");
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { data: event, isLoading, error, refetch } = useEvent(eventId);
  const dates = useEventDates();
  const departmentName = useDepartmentName();
  const [now] = React.useState(() => Date.now());

  const backHref = searchParams.get("from") === "points" ? "/points" : "/events";
  const backLabel = searchParams.get("from") === "points" ? t("backToPoints") : t("backToEvents");

  const isActiveTab = (tabPath: string) => {
    if (tabPath === "") {
      return pathname === `/events/${eventId}` || pathname === `/events/${eventId}/`;
    }
    return pathname === `/events/${eventId}${tabPath}`;
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5" aria-busy="true">
        <Skeleton className="h-9 w-32" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-2/3 max-w-lg" />
          <Skeleton className="h-6 w-80 max-w-full" />
        </div>
        <div className="border-foreground flex gap-6 border-b pb-3">
          {["w-24", "w-36", "w-28", "w-20", "w-24"].map((w, i) => (
            <TabSkeleton key={i} w={w} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex flex-col gap-3">
            {["w-full", "w-5/6", "w-full", "w-3/4", "w-2/3"].map((w, i) => (
              <Skeleton key={i} className={`h-10 ${w}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !(error instanceof ApiRequestError && error.isNotFound)) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <CalendarX className="size-4" />
        <AlertTitle>{t("errorPrefix", { message: error.message })}</AlertTitle>
      </Alert>
    );
  }

  if (error || !event) {
    return (
      <Empty className="min-h-[60vh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX />
          </EmptyMedia>
          <EmptyTitle>{t("eventNotFound")}</EmptyTitle>
          <EmptyDescription>{t("eventNotFoundDescription")}</EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link href="/events">{t("goBackToEvents")}</Link>
        </Button>
      </Empty>
    );
  }

  const start = parseLocalDateTime(event.start_datetime);
  const end = getEffectiveEndDate(start, parseLocalDateTime(event.end_datetime));
  const dept = departmentName(event);
  const LocationIcon = event.location_type === "online" ? Globe : MapPin;
  const showLocation = event.location_type !== "none" && event.location_type !== "hidden" && Boolean(event.location);
  const lifecycle = resolveLifecycleState(event, now);
  const showRegistrationBadge = lifecycle === "upcoming" || lifecycle === "live";
  const showPublicLink = !isCustomEvent(event);
  const eventUrl = `${config.memberAppUrl}/events/${event.id}`;
  const displayUrl = eventUrl.replace(/^https?:\/\//, "");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success(tp("linkCopied"));
    } catch {
      toast.error(tp("copyFailed"));
    }
  };

  return (
    <EventProvider event={event} isLoading={isLoading} error={error} refetch={refetch}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:gap-5">
        <Button variant="ghost" size="sm" asChild className="-ms-3 self-start">
          <Link href={backHref}>
            <ArrowLeft className="rtl:-scale-x-100" />
            {backLabel}
          </Link>
        </Button>

        <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="font-display line-clamp-3 text-[26px] leading-relaxed font-semibold text-balance sm:text-[30px]">
              <bdi>{event.name}</bdi>
            </h1>
            <div className="text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px]">
              <StatusBadge event={event} now={now} />
              {showRegistrationBadge ? <RegistrationBadge event={event} now={now} variant="pill" /> : null}
              <span className="tabular text-foreground flex items-center gap-1.5 font-medium">
                <CalendarDays className="size-4" aria-hidden="true" />
                {dates.range(start, end)}
              </span>
              {showLocation ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <LocationIcon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate" dir="auto">
                    {event.location}
                  </span>
                </span>
              ) : null}
              {dept ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Building2 className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate" dir="auto">
                    {dept}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {showPublicLink ? (
            <div
              aria-label={tp("eventLink")}
              className="bg-card ring-rule flex w-full shrink-0 items-center gap-1.5 rounded-lg p-1.5 ring-1 lg:w-auto lg:max-w-md"
            >
              <span
                dir="ltr"
                className="text-ink-2 tabular flex min-w-0 flex-1 items-center gap-1.5 px-2 text-[13px] font-medium"
              >
                <Link2 className="text-ink-3 size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{displayUrl}</span>
              </span>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
                <Copy />
                {tp("copyLink")}
              </Button>
              <EventQrCodeDialog
                url={eventUrl}
                eventName={event.name}
                trigger={
                  <Button variant="outline" size="icon-sm" title={tp("showQr")} aria-label={tp("showQr")}>
                    <QrCode />
                  </Button>
                }
              />
              {event.status === "published" ? (
                <Button variant="outline" size="icon-sm" asChild>
                  <a
                    href={eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tp("openEvent")}
                    aria-label={tp("openEvent")}
                  >
                    <ExternalLink className="rtl:-scale-x-100" />
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* Sticky under the top bar on phones so switching tab never needs a
            scroll back up; the strip scrolls sideways and keeps the current
            tab in view. */}
        <nav
          aria-label={t("tabsLabel")}
          className="bg-card border-rule sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-30 -mx-4 rounded-t-xl border-b px-2 sm:-mx-6 sm:px-4 md:static md:mx-0 md:px-2"
        >
          <div className="no-scrollbar flex gap-1 overflow-x-auto overscroll-x-contain">
            {TAB_ITEMS.map((tab) => {
              const isActive = isActiveTab(tab.path);
              const href = `/events/${eventId}${tab.path}`;
              return (
                <Link
                  key={tab.value}
                  href={href}
                  prefetch
                  aria-current={isActive ? "page" : undefined}
                  ref={isActive ? scrollIntoViewOnMount : undefined}
                  className={`focus-visible:outline-ring relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                    isActive ? "text-foreground font-bold" : "text-ink-2 hover:text-foreground font-medium"
                  }`}
                >
                  <tab.icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  {t(`tabs.${tab.key}`)}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="bg-foreground absolute inset-x-2 -bottom-px h-[3px] rounded-t-[2px]"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </EventProvider>
  );
}

"use client";

import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, Link2, Users, ClipboardCheck, Pencil, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { EventProvider } from "@/contexts/event-context";
import { useEvent } from "@/hooks/use-event";
import { ApiRequestError } from "@/lib/api/errors";
import { useTranslations } from "next-intl";

const TAB_ITEMS = [
  { value: "info", key: "info", icon: Info, path: "" },
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
    <div className="flex items-center gap-2 pb-3">
      <Skeleton className="h-4 w-4" />
      <Skeleton className={`h-4 ${w}`} />
    </div>
  );
}

export function EventLayoutContent({ eventId, children }: { eventId: string; children: React.ReactNode }) {
  const t = useTranslations("eventLayout");
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { data: event, isLoading, error, refetch } = useEvent(eventId);

  const backHref = searchParams.get('from') === 'points' ? '/points' : '/events';
  const backLabel = searchParams.get('from') === 'points' ? t('backToPoints') : t('backToEvents');

  const isActiveTab = (tabPath: string) => {
    if (tabPath === "") {
      return pathname === `/events/${eventId}` || pathname === `/events/${eventId}/`;
    }
    return pathname === `/events/${eventId}${tabPath}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-6">
          <div className="border-b">
            <div className="flex gap-6">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-primary">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              {["w-36", "w-32", "w-24", "w-20"].map((w, i) => (
                <TabSkeleton key={i} w={w} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="w-full aspect-square sm:aspect-auto sm:h-150 rounded-lg" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-32" />
              </div>
              <div className="space-y-4">
                {["w-56", "w-48", "w-40"].map((w, i) => (
                  <Skeleton key={i} className={`h-6 ${w}`} />
                ))}
              </div>
              <div className="space-y-4 rounded-lg border bg-card p-6 mt-8">
                <Skeleton className="h-7 w-32" />
                <div className="space-y-3">
                  {["w-full", "w-full", "w-5/6", "w-full", "w-3/4"].map((w, i) => (
                    <Skeleton key={i} className={`h-4 ${w}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiRequestError && error.isNotFound) {
      return (
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarX />
                  </EmptyMedia>
                  <EmptyTitle>{t('eventNotFound')}</EmptyTitle>
                  <EmptyDescription>
                    {t('eventNotFoundDescription')}
                  </EmptyDescription>
                </EmptyHeader>
                <Button asChild>
                  <Link href="/events">{t('goBackToEvents')}</Link>
                </Button>
              </Empty>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="text-center py-12 text-destructive">
        {t('errorPrefix', { message: error.message })}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarX />
                </EmptyMedia>
                <EmptyTitle>{t('eventNotFound')}</EmptyTitle>
                <EmptyDescription>
                  {t('eventNotFoundDescription')}
                </EmptyDescription>
              </EmptyHeader>
              <Button asChild>
                <Link href="/events">{t('goBackToEvents')}</Link>
              </Button>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EventProvider event={event} isLoading={isLoading} error={error} refetch={refetch}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-2 sm:flex-col sm:gap-3">
          <Button variant="ghost" size="sm" asChild className="-ms-2 shrink-0 max-sm:size-9 max-sm:px-0">
            <Link href={backHref} className="flex items-center gap-2" aria-label={backLabel}>
              <ArrowLeft className="h-4 w-4 rtl:-scale-x-100 max-sm:h-5 max-sm:w-5" />
              <span className="max-sm:hidden">{backLabel}</span>
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1 sm:flex-row sm:items-center sm:gap-3 sm:pt-0">
            <h1 className="font-display line-clamp-3 text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl" dir="auto">
              {event.name}
            </h1>
            <StatusBadge status={event.status} className="shrink-0" />
          </div>
        </div>

        {/* Sticky under the top bar on phones so switching tab never needs a
            scroll back up; the strip scrolls sideways and keeps the current
            tab in view. */}
        <nav className="bg-background/95 supports-backdrop-filter:bg-background/80 border-border sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 border-b px-2 supports-backdrop-filter:backdrop-blur-lg sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
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
                  className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors pointer-coarse:py-3.5 ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {t(`tabs.${tab.key}`)}
                  {isActive && (
                    <span className="bg-primary absolute inset-x-2 bottom-0 h-[3px] rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-6">
          {children}
        </div>
      </div>
    </EventProvider>
  );
}

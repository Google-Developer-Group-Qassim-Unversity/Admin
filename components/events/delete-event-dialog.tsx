"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAccess } from "@/hooks/use-access";
import {
  useDeleteEvent,
  useEventDeletionImpact,
  useEventDeletionResource,
} from "@/hooks/use-event";
import type { Event } from "@/lib/api-types";
import { useFormatters } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Count, RowsSkeleton } from "@/components/najdi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const RESOURCE_ORDER = [
  "submissions",
  "members_logs",
  "departments_logs",
  "event_content_links",
  "forms",
  "event_requests",
];

const DESTINATIONS: Record<string, string> = {
  submissions: "responses",
  members_logs: "attendance",
  forms: "manage",
  form_access_grants: "manage",
  event_content_links: "content",
};

function ResourceRow({
  eventId,
  resource,
  count,
}: {
  eventId: number;
  resource: string;
  count: number;
}) {
  const t = useTranslations("eventDeletion");
  const fmt = useFormatters();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const query = useEventDeletionResource(eventId, resource, page, expanded);
  const key = `resources.${resource}`;
  const label = t.has(key) ? t(key) : resource.replaceAll("_", " ");
  const destination = DESTINATIONS[resource];
  return (
    <li className="border-rule border-b">
      <div
        data-deletion-row
        className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 py-1"
      >
        <button
          type="button"
          className="hover:bg-sunk focus-visible:ring-ring grid min-h-12 min-w-0 grid-cols-[1.125rem_minmax(0,1fr)_2.5rem] items-center gap-3 rounded-lg px-2 text-start focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          aria-expanded={expanded}
          aria-controls={`resource-${resource}`}
          disabled={count === 0}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown
            aria-hidden
            className={`size-[18px] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span className="min-w-0 text-sm font-bold">{label}</span>
          <span data-deletion-count className="justify-self-end">
            <Count className="w-8">{fmt.number(count)}</Count>
          </span>
        </button>
        {destination && count > 0 ? (
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link
              href={`/events/${eventId}/${destination}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("openResource", { resource: label })}
            >
              <ArrowUpRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        ) : (
          <span aria-hidden className="size-11" />
        )}
      </div>
      {expanded && (
        <div id={`resource-${resource}`} className="px-2 pb-4 sm:ps-10">
          {query.isPending ? (
            <RowsSkeleton rows={3} />
          ) : query.isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t("loadFailed")}</AlertTitle>
              <AlertDescription>
                <Button variant="outline" onClick={() => query.refetch()}>
                  {t("retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <ul className="divide-rule divide-y">
                {query.data.items.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="font-medium">
                        {resource === "event_requests" ? (
                          <Link
                            className="underline underline-offset-4"
                            href={`/pipeline/requests/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <bdi>{item.label}</bdi>
                            <ArrowUpRight className="ms-1 inline size-4 rtl:-scale-x-100" />
                          </Link>
                        ) : (
                          <bdi>{item.label}</bdi>
                        )}
                      </span>
                      <span
                        className="text-ink-3 tabular max-w-full break-all text-xs"
                        dir="ltr"
                      >
                        #{item.id}
                      </span>
                    </div>
                    {Object.entries(item.details).map(([field, value]) => (
                      <p
                        key={field}
                        className="text-ink-2 mt-1 break-words text-xs"
                      >
                        {t.has(`fields.${field}`)
                          ? t(`fields.${field}`)
                          : field}
                        :{" "}
                        {["date", "submitted_at", "cancelled_at"].includes(
                          field,
                        ) ? (
                          fmt.dateTime(value)
                        ) : ["is_accepted", "is_invited"].includes(field) ? (
                          t(value === "1" ? "yes" : "no")
                        ) : t.has(`values.${value}`) ? (
                          t(`values.${value}`)
                        ) : (
                          <bdi>{value}</bdi>
                        )}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
              {query.data.total === 0 && (
                <p className="text-ink-2 py-3 text-sm">{t("emptyResource")}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink-3 text-xs">
                  {t("page", {
                    page,
                    pages: Math.max(
                      1,
                      Math.ceil(query.data.total / query.data.page_size),
                    ),
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {t("previous")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page * query.data.page_size >= query.data.total}
                    onClick={() => setPage(page + 1)}
                  >
                    {t("next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export function DeleteEventDialog({ event }: { event: Event }) {
  const t = useTranslations("eventDeletion");
  const { isSuperAdmin } = useAccess();
  const [open, setOpen] = useState(false);
  const impact = useEventDeletionImpact(event.id, isSuperAdmin && open);
  const deletion = useDeleteEvent();
  const router = useRouter();
  const fmt = useFormatters();
  const [error, setError] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  const handleDelete = async () => {
    setError(null);
    try {
      await deletion.mutateAsync(event.id);
      toast.success(t("deleted"));
      setOpen(false);
      router.push("/events");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("deleteFailed"));
    }
  };
  const priority = (key: string) =>
    RESOURCE_ORDER.includes(key)
      ? RESOURCE_ORDER.indexOf(key)
      : RESOURCE_ORDER.length;
  const visibleResources =
    impact.data?.resources
      .filter(
        (resource) =>
          resource.count > 0 ||
          ["submissions", "members_logs"].includes(resource.key),
      )
      .sort((a, b) => priority(a.key) - priority(b.key)) ?? [];
  const hasActivity = impact.data?.resources.some(
    (resource) =>
      resource.count > 0 &&
      ["submissions", "members_logs"].includes(resource.key),
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!deletion.isPending) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="shrink-0 self-start">
          <Trash2 />
          {t("reviewButton")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        closeDisabled={deletion.isPending}
        closeLabel={t("close")}
        className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-xl flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0"
      >
        <AlertDialogHeader className="border-rule shrink-0 gap-2 border-b p-5 pe-14 text-start max-sm:place-items-start sm:p-6 sm:pe-14">
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("intro")}</AlertDialogDescription>
          <p className="break-words text-sm font-bold">
            <bdi>{impact.data?.event_name ?? event.name}</bdi>
          </p>
        </AlertDialogHeader>
        <div
          data-deletion-scroll
          className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6"
          aria-busy={impact.isFetching}
        >
          {impact.isPending ? (
            <RowsSkeleton rows={4} />
          ) : impact.isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t("loadFailed")}</AlertTitle>
              <AlertDescription>
                <p>{t("loadFailedDescription")}</p>
                <Button variant="outline" onClick={() => impact.refetch()}>
                  {t("retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{t("willDelete")}</p>
                <span className="text-ink-3 tabular text-xs">
                  {t("summary", { count: fmt.number(impact.data.total) })}
                </span>
              </div>
              <p className="text-ink-2 mb-3 text-xs">
                {hasActivity ? t("activityHint") : t("quietHint")}
              </p>
              <ul>
                <li className="border-rule border-b">
                  <div
                    data-deletion-row
                    className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 py-1"
                  >
                    <div className="grid min-h-12 min-w-0 grid-cols-[1.125rem_minmax(0,1fr)_2.5rem] items-center gap-3 px-2 text-sm">
                      <span aria-hidden />
                      <span className="min-w-0 font-bold">
                        {t("eventRecord")}
                      </span>
                      <span data-deletion-count className="justify-self-end">
                        <Count className="w-8">1</Count>
                      </span>
                    </div>
                    <span aria-hidden className="size-11" />
                  </div>
                </li>
                {visibleResources.map((resource) => (
                  <ResourceRow
                    key={resource.key}
                    eventId={event.id}
                    resource={resource.key}
                    count={resource.count}
                  />
                ))}
              </ul>
              <p className="text-ink-3 mt-3 text-xs">{t("inspectHint")}</p>
              <div className="border-rule mt-4 border-t pt-4 text-xs leading-relaxed text-ink-2">
                <p>{t("effects")}</p>
                <p className="mt-2">{t("kept")}</p>
                {impact.data.retained_notifications > 0 && (
                  <p className="mt-2">
                    {t("keepNotifications", {
                      count: impact.data.retained_notifications,
                    })}
                  </p>
                )}
              </div>
            </>
          )}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>{t("deleteFailed")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <AlertDialogFooter className="border-rule shrink-0 border-t p-4 sm:p-5">
          <AlertDialogCancel disabled={deletion.isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="madder"
            disabled={
              !impact.data ||
              impact.isError ||
              impact.isFetching ||
              deletion.isPending
            }
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            <Trash2 />
            {deletion.isPending ? t("deleting") : t("deletePermanently")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

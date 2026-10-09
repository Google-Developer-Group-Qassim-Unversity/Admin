"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, CalendarPlus, Route } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BanEditor } from "@/components/pipeline/ban-editor";
import { BookPanel } from "@/components/pipeline/book-panel";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { RequestList, RequestRow } from "@/components/pipeline/request-list";
import { PipelineGate, hasTeam, useOwnDepartmentIds } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useInbox, usePipelineRequests } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { EventRequestSummary, PipelineMe, PipelineTeam } from "@/lib/pipeline-types";

export default function PipelinePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PipelineGate>
        {(me) => (
          // useSearchParams needs a boundary so the page can still prerender.
          <React.Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <PipelineHome me={me} />
          </React.Suspense>
        )}
      </PipelineGate>
    </div>
  );
}

/**
 * Two jobs: see where requests stand, and book new dates. Booking mode lives in
 * the URL (`?book=1`) so the shell's Book dates door can open it from anywhere.
 * On a phone the requests lead and the calendar follows; in booking mode the
 * calendar takes the whole screen.
 */
function PipelineHome({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline");
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownIds = useOwnDepartmentIds(me);
  const [bans, setBans] = React.useState(false);
  const booking = searchParams.get("book") === "1";
  const mode = booking ? "book" : bans ? "bans" : "view";
  const isLogistics = me.is_super_admin || me.departments.some((d) => d.teams.includes("logistics"));
  const calendarRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mode !== "view") calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mode]);

  const openBooking = () => {
    setBans(false);
    router.push("/pipeline?book=1", { scroll: false });
  };
  const closeBooking = () => router.replace("/pipeline", { scroll: false });

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} icon={Route}>
        {mode === "view" ? (
          <>
            {isLogistics ? (
              <Button variant="outline" onClick={() => setBans(true)}>
                <Ban />
                {t("bans.edit")}
              </Button>
            ) : null}
            <Button variant="ochre" onClick={openBooking}>
              <CalendarPlus />
              {t("book.start")}
            </Button>
          </>
        ) : null}
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <section
          ref={calendarRef}
          aria-label={t("calendar.title")}
          className={cn(
            "bg-card flex scroll-mt-24 flex-col gap-4 rounded-xl p-4 ring-1 sm:p-5",
            mode === "view" ? "ring-rule max-lg:order-2" : "ring-door-ochre ring-2",
          )}
        >
          {mode === "book" ? (
            <BookPanel me={me} ownIds={ownIds} onDone={closeBooking} />
          ) : mode === "bans" ? (
            <BanEditor onDone={() => setBans(false)} />
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-bold">{t("calendar.title")}</h2>
                <p className="text-ink-2 text-[13px]">{t("calendar.subtitle")}</p>
              </div>
              <BookingCalendar
                onDayClick={(day) => {
                  const first = day.requests?.[0];
                  if (first) router.push(`/pipeline/requests/${first.id}`);
                }}
                isSelectable={(day) => Boolean(day.requests?.length)}
              />
            </>
          )}
        </section>

        <div className={cn("max-lg:order-1", mode !== "view" && "max-lg:hidden")}>
          <RequestsCard me={me} />
        </div>
      </div>
    </>
  );
}

/**
 * One list, two views: what is waiting on the caller's teams, and the
 * requests the caller can see. Opens on whichever has something to do.
 */
function RequestsCard({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline");
  const withTeam = hasTeam(me);
  const requests = usePipelineRequests();
  const inbox = useInbox(withTeam);
  // The inbox has one entry per open task, so a request two of the caller's teams
  // are working on (every team, for a super admin) would show twice.
  const inboxRequests = inbox.data
    ? [...new Map(inbox.data.map((item) => [item.request.id, item.request])).values()]
    : undefined;
  const teamsOf = React.useMemo(() => {
    const map = new Map<string, PipelineTeam[]>();
    for (const item of inbox.data ?? []) map.set(item.request.id, [...(map.get(item.request.id) ?? []), item.team]);
    return map;
  }, [inbox.data]);

  const [picked, setPicked] = React.useState<"inbox" | "mine" | null>(null);
  const view = !withTeam ? "mine" : (picked ?? (inboxRequests?.length ? "inbox" : "mine"));
  const count = (n: number | undefined) => (n ? ` · ${n}` : "");
  const mineLabel = me.is_super_admin ? t("requests.title") : t("requests.tab");

  return (
    <section className="flex flex-col gap-3 lg:bg-card lg:rounded-xl lg:p-5 lg:ring-1 lg:ring-rule">
      {withTeam ? (
        <SegmentedControl
          label={t("requests.title")}
          value={view}
          onValueChange={(v) => setPicked(v as "inbox" | "mine")}
          options={[
            { value: "inbox", label: `${t("inbox.tab")}${count(inboxRequests?.length)}` },
            { value: "mine", label: `${mineLabel}${count(requests.data?.total)}` },
          ]}
        />
      ) : (
        <h2 className="border-foreground border-b pb-2 text-base font-bold">{t("requests.mine")}</h2>
      )}
      {view === "inbox" ? (
        <InboxList items={inboxRequests} teamsOf={teamsOf} isPending={inbox.isPending} />
      ) : (
        <RequestList items={requests.data?.items} isPending={requests.isPending} empty={t("requests.none")} />
      )}
    </section>
  );
}

/** What is waiting on the caller's teams, each row naming the team. */
function InboxList({
  items,
  teamsOf,
  isPending,
}: {
  items: EventRequestSummary[] | undefined;
  teamsOf: Map<string, PipelineTeam[]>;
  isPending: boolean;
}) {
  const t = useTranslations("pipeline");
  if (isPending || !items?.length) return <RequestList items={items} isPending={isPending} empty={t("inbox.none")} />;
  return (
    <ul className="flex flex-col">
      {items.map((r) => {
        const teams = teamsOf.get(r.id) ?? [];
        return (
          <li key={r.id}>
            <RequestRow
              request={r}
              extra={
                teams.length ? (
                  <span className="bg-door-ochre-soft text-door-ochre-ink rounded-sm px-1.5 py-0.5">
                    {teams.map((team) => t(`teams.${team}`)).join(" · ")}
                  </span>
                ) : null
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

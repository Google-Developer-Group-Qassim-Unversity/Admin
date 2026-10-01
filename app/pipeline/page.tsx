"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Ban, CalendarPlus, Workflow } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BanEditor } from "@/components/pipeline/ban-editor";
import { BookPanel } from "@/components/pipeline/book-panel";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { RequestList } from "@/components/pipeline/request-list";
import { PipelineGate } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useInbox, usePipelineRequests } from "@/hooks/use-pipeline";
import type { PipelineMe } from "@/lib/pipeline-types";

export default function PipelinePage() {
  const t = useTranslations("pipeline");

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Workflow} />
      <PipelineGate>{(me) => <PipelineHome me={me} />}</PipelineGate>
    </div>
  );
}

/**
 * Two jobs: see where your requests stand, and book new dates. The requests
 * lead on a phone; on a wide screen the calendar takes the room and the list
 * sits beside it. Notifications live in the top bar's bell.
 */
function PipelineHome({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline");
  const [mode, setMode] = React.useState<"view" | "book" | "bans">("view");
  const isLogistics = me.is_super_admin || me.departments.some((d) => d.teams.includes("logistics"));
  const hasTeam = me.is_super_admin || me.departments.some((d) => d.teams.length > 0);

  const toolbar =
    mode === "view" ? (
      <>
        {isLogistics ? (
          <Button variant="ghost" size="sm" onClick={() => setMode("bans")} title={t("bans.edit")}>
            <Ban className="h-4 w-4" />
            <span className="max-sm:sr-only">{t("bans.edit")}</span>
          </Button>
        ) : null}
        <Button size="sm" onClick={() => setMode("book")}>
          <CalendarPlus className="h-4 w-4" />
          {t("book.start")}
        </Button>
      </>
    ) : null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <section
        className={`bg-card flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:p-5 max-lg:order-2 ${
          mode === "view" ? "border-border" : "border-primary/40 ring-primary/15 ring-4"
        }`}
      >
        {mode === "book" ? (
          <BookPanel me={me} onDone={() => setMode("view")} />
        ) : mode === "bans" ? (
          <BanEditor onDone={() => setMode("view")} />
        ) : (
          <BookingCalendar toolbar={toolbar} />
        )}
      </section>

      <RequestsCard hasTeam={hasTeam} />
    </div>
  );
}

/**
 * One list, two views: what is waiting on the caller's team, and the caller's
 * departments' own requests. Opens on whichever has something to do.
 */
function RequestsCard({ hasTeam }: { hasTeam: boolean }) {
  const t = useTranslations("pipeline");
  const requests = usePipelineRequests();
  const inbox = useInbox(hasTeam);
  // The inbox has one entry per open task, so a request two of the caller's teams
  // are working on (every team, for a super admin) would show twice.
  const inboxRequests = inbox.data
    ? [...new Map(inbox.data.map((item) => [item.request.id, item.request])).values()]
    : undefined;

  const [picked, setPicked] = React.useState<"inbox" | "mine" | null>(null);
  const view = !hasTeam ? "mine" : (picked ?? (inboxRequests?.length ? "inbox" : "mine"));

  const count = (n: number | undefined) => (n ? ` · ${n}` : "");

  return (
    <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4 sm:p-5 max-lg:order-1">
      {hasTeam ? (
        <SegmentedControl
          label={t("requests.title")}
          value={view}
          onValueChange={(v) => setPicked(v as "inbox" | "mine")}
          options={[
            { value: "inbox", label: `${t("inbox.tab")}${count(inboxRequests?.length)}` },
            { value: "mine", label: `${t("requests.tab")}${count(requests.data?.total)}` },
          ]}
        />
      ) : (
        <h2 className="font-display text-lg font-semibold tracking-tight">{t("requests.mine")}</h2>
      )}
      {view === "inbox" ? (
        <RequestList items={inboxRequests} isPending={inbox.isPending} empty={t("inbox.none")} />
      ) : (
        <RequestList items={requests.data?.items} isPending={requests.isPending} empty={t("requests.none")} />
      )}
    </section>
  );
}

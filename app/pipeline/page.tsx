"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ban, CalendarPlus, KeyRound, Workflow } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BanEditor } from "@/components/pipeline/ban-editor";
import { BookPanel } from "@/components/pipeline/book-panel";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { NotificationsPanel } from "@/components/pipeline/notifications-panel";
import { RequestList } from "@/components/pipeline/request-list";
import { PipelineGate } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { usePipelineRequests } from "@/hooks/use-pipeline";
import type { PipelineMe } from "@/lib/pipeline-types";

export default function PipelinePage() {
  const t = useTranslations("pipeline");

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Workflow}>
        <Button asChild variant="outline">
          <Link href="/pipeline/team">
            <KeyRound className="h-4 w-4" />
            {t("teamAccess")}
          </Link>
        </Button>
      </PageHeader>
      <PipelineGate>{(me) => <PipelineHome me={me} />}</PipelineGate>
    </div>
  );
}

function PipelineHome({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline");
  const [mode, setMode] = React.useState<"view" | "book" | "bans">("view");
  const isLogistics = me.is_super_admin || me.departments.some((d) => d.teams.includes("logistics"));
  const requests = usePipelineRequests();

  return (
    <>
      <NotificationsPanel />
      <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">{t("calendar.title")}</h2>
            <p className="text-muted-foreground text-[13px]">{t("calendar.subtitle")}</p>
          </div>
          {mode === "view" ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMode("book")}>
                <CalendarPlus className="h-4 w-4" />
                {t("book.start")}
              </Button>
              {isLogistics ? (
                <Button variant="outline" onClick={() => setMode("bans")}>
                  <Ban className="h-4 w-4" />
                  {t("bans.edit")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {mode === "book" ? (
          <BookPanel me={me} onDone={() => setMode("view")} />
        ) : mode === "bans" ? (
          <BanEditor onDone={() => setMode("view")} />
        ) : (
          <BookingCalendar />
        )}
      </section>

      <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">{t("requests.mine")}</h2>
        <RequestList items={requests.data?.items} isPending={requests.isPending} empty={t("requests.none")} />
      </section>
    </>
  );
}

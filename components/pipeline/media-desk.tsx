"use client";

import { useTranslations } from "next-intl";
import { Check, ExternalLink, FileCheck2, ImageIcon } from "lucide-react";

import { Door, DoorPanel, Fact, INK, Plate, SectionHead } from "@/components/najdi";
import { BehalfFrame, useBehalfOf } from "@/components/pipeline/roles";
import { useFormatDateRange } from "@/components/pipeline/shared";
import { TeamActionButtons } from "@/components/pipeline/team-actions";
import { isolate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventRequestDetail, LogisticsConfirmation } from "@/lib/pipeline-types";

/**
 * Media's station. Media works from what the two teams before it hand over,
 * so the station is built the same way theirs are: what comes in (Design's
 * poster, Logistics' confirmed event), then Media's own part.
 *
 * Media's part today is one button. When Media gets deliverables of its own,
 * they belong in `MediaJob`, the way the poster lives in Design's job
 * (`DesignPoster`) and the confirmation in Logistics' (`LogisticsConfirmation`):
 * read from `task.deliverable`, checked by `task.deliverable_missing`, shown on
 * Publish once handed over.
 */

const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

/** Media's turn: its job on a door (or, for a super admin who is not on Media, a frame with the controls set apart). */
export function MediaJob({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.stations");
  const tr = useTranslations("pipeline.review");
  const tt = useTranslations("pipeline.teams");
  const canFinish = request.actions.complete.includes("media");
  const behalf = useBehalfOf(canFinish ? { kind: "team", team: "media" } : null);
  if (!canFinish) return null;

  if (behalf) {
    return (
      <BehalfFrame
        party={behalf}
        aria-labelledby="media-job"
        title={<span id="media-job">{tr("teamTurn", { team: tt("media") })}</span>}
        note={tr("teamTurnFor", { team: isolate(tt("media")) })}
        actions={<TeamActionButtons request={request} onWall teams={["media"]} />}
      />
    );
  }

  return (
    <Door tone="ochre" aria-labelledby="media-job">
      <h2 id="media-job" className="font-display text-[21px] leading-tight font-semibold">
        {t("media.title")}
      </h2>
      <DoorPanel>
        <p className="text-sm font-medium">{t("media.door")}</p>
      </DoorPanel>
      <TeamActionButtons request={request} teams={["media"]} />
    </Door>
  );
}

function Handover({
  icon,
  title,
  from,
  arrived,
  children,
}: {
  icon: typeof ImageIcon;
  title: string;
  from: string;
  arrived: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations("pipeline.stations.receives");
  return (
    <li className="border-rule flex flex-col gap-3 border-b py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <Plate tone={arrived ? "green" : "neutral"} icon={arrived ? Check : icon} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">{title}</span>
          <span className="text-ink-2 text-[12.5px]">{from}</span>
        </div>
        <span className={cn("text-[12.5px] font-bold", arrived ? INK.green : "text-ink-3")}>{arrived ? t("arrived") : t("notYet")}</span>
      </div>
      {arrived && children ? <div className="ps-11">{children}</div> : null}
    </li>
  );
}

/** What Media receives, and whether it has arrived: the poster from Design, the event as Logistics confirmed it. */
export function MediaReceives({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.stations.receives");
  const tc = useTranslations("pipeline.confirm.summary");
  const tp = useTranslations("pipeline.poster");
  const td = useTranslations("pipeline.details");
  const formatRange = useFormatDateRange();
  const design = request.tasks.find((x) => x.team === "design");
  const logistics = request.tasks.find((x) => x.team === "logistics");
  const posterUrl = (design?.deliverable?.poster_url as string | undefined) ?? null;
  const confirmed = logistics?.status === "done" ? (logistics.deliverable as unknown as LogisticsConfirmation | null) : null;
  const modes = new Set(Object.values(confirmed?.day_modes ?? {}));
  const place = [confirmed?.venue, confirmed?.room].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="media-receives" className="flex flex-col gap-1">
      <SectionHead id="media-receives" title={t("title")} />
      <ul className="flex flex-col">
        <Handover icon={ImageIcon} title={t("poster")} from={t("posterFrom")} arrived={design?.status === "done" && !!posterUrl}>
          {posterUrl ? (
            <div className="flex flex-col items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- an R2 URL, shown as uploaded */}
              <img
                src={posterUrl}
                alt={tp("alt", { title: request.title ?? "" })}
                className="bg-sunk max-h-64 w-auto max-w-full rounded-sm object-contain shadow-[0_0_0_1px_var(--rule)]"
              />
              <a
                href={posterUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-1 text-[13px] font-bold underline underline-offset-2"
              >
                {tp("openFull")}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : null}
        </Handover>
        <Handover icon={FileCheck2} title={t("confirmed")} from={t("confirmedFrom")} arrived={!!confirmed}>
          {confirmed ? (
            <dl className="grid grid-cols-[fit-content(55%)_minmax(0,1fr)] gap-x-1">
              <Fact term={tc("dates")}>
                <span className="tabular">{confirmed.start_date ? formatRange(confirmed.start_date, confirmed.end_date) : "-"}</span>
              </Fact>
              <Fact term={tc("time")}>
                <span className="tabular" dir="ltr">{`${hhmm(confirmed.daily_start_time)}–${hhmm(confirmed.daily_end_time)}`}</span>
              </Fact>
              <Fact term={tc("mode")}>{[...modes].map((m) => td(`modes.${m}`)).join(" + ") || "-"}</Fact>
              {modes.has("on_site") ? <Fact term={tc("place")}>{place ? <bdi>{place}</bdi> : "-"}</Fact> : null}
              {modes.has("online") && confirmed.meet_link ? (
                <Fact term={tc("meet")}>
                  <a href={confirmed.meet_link} target="_blank" rel="noreferrer" dir="ltr" className="break-all underline underline-offset-2">
                    {confirmed.meet_link}
                  </a>
                </Fact>
              ) : null}
              <Fact term={tc("type")}>{confirmed.event_type ? td(`eventTypes.${confirmed.event_type}`) : "-"}</Fact>
            </dl>
          ) : null}
        </Handover>
      </ul>
    </section>
  );
}

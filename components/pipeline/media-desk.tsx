"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, CircleCheck, ExternalLink, FileCheck2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Door, Fact, INK, Mark, Plate, SectionHead } from "@/components/najdi";
import { DraftSaveStatus, useAutosavedDraft, useDraftSave } from "@/components/pipeline/draft-autosave";
import { Field, FormSection, MissingProvider, focusField } from "@/components/pipeline/form-kit";
import { BehalfFrame, useBehalfOf } from "@/components/pipeline/roles";
import { useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { pipelineKeys, useCompleteTask, useSaveDeliverable } from "@/hooks/use-pipeline";
import { isolate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MEDIA_PLATFORMS,
  type EventRequestDetail,
  type LogisticsConfirmation,
  type MediaPlatform,
  type MediaShares,
} from "@/lib/pipeline-types";

/**
 * Media's station. Media works from what the two teams before it hand over,
 * so the station is built the same way theirs are: what comes in (Design's
 * poster, Logistics' confirmed event), then Media's own part.
 *
 * Media's own part is where it shared the event (X, Instagram, TikTok, or
 * somewhere it names, each with the post's link if it has one), all optional:
 * read from `task.deliverable`, checked by `task.deliverable_missing` (a name
 * for "somewhere else", a link that is a link), and shown on Publish once
 * Media is done, the way the poster and the confirmation are.
 */

const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

const NO_SHARES: MediaShares = { platforms: [], other_platform: null, links: {} };

/**
 * Media's turn: where it shared the event, then finishing. On a door, or for a
 * super admin who is not on Media, a frame that says whose turn it is.
 */
export function MediaJob({ request }: { request: EventRequestDetail }) {
  if (!request.actions.complete.includes("media")) return null;
  return <ShareForm request={request} />;
}

function ShareForm({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.stations");
  const ts = useTranslations("pipeline.share");
  const tr = useTranslations("pipeline.review");
  const tt = useTranslations("pipeline.teams");
  const queryClient = useQueryClient();
  const task = request.tasks.find((x) => x.team === "media")!;
  const save = useSaveDeliverable(request.id, "media");
  const complete = useCompleteTask(request.id);
  const behalf = useBehalfOf({ kind: "team", team: "media" });
  const { flushAll, state } = useDraftSave();
  // A name or link marked only after someone tries to finish.
  const [shown, setShown] = React.useState(false);

  const draft = useAutosavedDraft<MediaShares>({
    key: "share",
    server: (task.deliverable as unknown as MediaShares | null) ?? NO_SHARES,
    enabled: true,
    save: (value) =>
      save.mutateAsync({
        platforms: value.platforms,
        other_platform: value.other_platform?.trim() || null,
        links: Object.fromEntries(
          Object.entries(value.links)
            .map(([p, link]) => [p, link?.trim()])
            .filter(([, link]) => link),
        ),
      }),
  });
  const form = draft.value;
  const busy = state === "saving" || complete.isPending;

  const toggle = (platform: MediaPlatform, on: boolean) =>
    draft.update((d) => ({
      ...d,
      platforms: MEDIA_PLATFORMS.filter((p) => (p === platform ? on : d.platforms.includes(p))),
    }));
  const setLink = (platform: MediaPlatform, link: string) =>
    draft.update((d) => ({ ...d, links: { ...d.links, [platform]: link } }));

  const onFinish = async () => {
    if (!(await flushAll())) return;
    // The save just refreshed the request; this render's copy may be older.
    const fresh = queryClient.getQueryData<EventRequestDetail>(pipelineKeys.request(request.id)) ?? request;
    const missing = fresh.tasks.find((x) => x.team === "media")?.deliverable_missing ?? [];
    if (missing.length) {
      setShown(true);
      focusField(missing[0]);
      toast.error(ts("incomplete", { count: missing.length }));
      return;
    }
    try {
      await complete.mutateAsync("media");
      toast.success(tr("marked"));
    } catch (error) {
      setShown(true);
      toast.error(error instanceof Error ? error.message : tr("failed"));
    }
  };

  return (
    <MissingProvider missing={task.deliverable_missing} shown={shown}>
      <section aria-labelledby="media-job" className="flex flex-col gap-3">
        {behalf ? (
          <BehalfFrame
            party={behalf}
            title={<span id="media-job">{tr("teamTurn", { team: tt("media") })}</span>}
            note={tr("teamTurnFor", { team: isolate(tt("media")) })}
          />
        ) : (
          <Door tone="ochre" innerClassName="gap-1.5">
            <h2 id="media-job" className="font-display text-[21px] leading-tight font-semibold">
              {t("media.title")}
            </h2>
            <p className="text-sm font-medium">{t("media.door")}</p>
          </Door>
        )}

        <div className="bg-card ring-rule flex flex-col gap-5 rounded-xl p-4 ring-1 sm:p-6">
          <FormSection title={ts("title")} description={ts("hint")}>
            <ul className="flex flex-col">
              {MEDIA_PLATFORMS.map((platform) => {
                const on = form.platforms.includes(platform);
                return (
                  <li key={platform} className="border-rule flex flex-col border-b last:border-b-0">
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1">
                      <Checkbox checked={on} onCheckedChange={(v) => toggle(platform, v === true)} />
                      <span className="text-[15px] font-bold">{ts(`platforms.${platform}`)}</span>
                    </label>
                    {on ? (
                      <div className="grid gap-3 ps-[30px] pb-4 md:grid-cols-2">
                        {platform === "other" ? (
                          <Field label={ts("otherName")} name="share.other_platform">
                            <Input
                              value={form.other_platform ?? ""}
                              maxLength={100}
                              placeholder={ts("otherPlaceholder")}
                              onChange={(e) => draft.update((d) => ({ ...d, other_platform: e.target.value }))}
                            />
                          </Field>
                        ) : null}
                        <Field
                          label={ts("link")}
                          name={`share.links.${platform}`}
                          optional
                          invalidText={ts("notALink")}
                          className={platform === "other" ? undefined : "md:col-span-2 md:max-w-xl"}
                        >
                          <Input
                            type="url"
                            inputMode="url"
                            dir="ltr"
                            maxLength={500}
                            value={form.links[platform] ?? ""}
                            placeholder="https://…"
                            onChange={(e) => setLink(platform, e.target.value)}
                          />
                        </Field>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </FormSection>

          <div className="border-rule flex items-center gap-3 border-t pt-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {behalf ? <span className="text-door-madder-ink text-[12.5px] font-bold">{ts("asSuperAdmin")}</span> : null}
              <DraftSaveStatus />
            </div>
            <Button variant="green" size="lg" onClick={onFinish} disabled={busy}>
              <CircleCheck />
              {behalf ? ts("buttonFor") : ts("button")}
            </Button>
          </div>
        </div>
      </section>
    </MissingProvider>
  );
}

/** Where Media shared the event, once it is done: on Media's station and on Publish. */
export function MediaShared({ request }: { request: EventRequestDetail }) {
  const ts = useTranslations("pipeline.share");
  const task = request.tasks.find((x) => x.team === "media");
  if (task?.status !== "done") return null;
  const shares = (task.deliverable as unknown as MediaShares | null) ?? NO_SHARES;

  return (
    <section aria-labelledby="media-shared" className="flex flex-col gap-1">
      <SectionHead
        id="media-shared"
        title={
          <>
            <Mark tone="green" />
            {ts("summaryTitle")}
          </>
        }
        action={task.done_by ? <span className="text-ink-2 font-medium">{ts("by", { name: isolate(task.done_by.name) })}</span> : null}
      />
      {shares.platforms.length ? (
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)]">
          {shares.platforms.map((platform) => {
            const link = shares.links[platform];
            return (
              <Fact
                key={platform}
                term={platform === "other" && shares.other_platform ? <bdi>{shares.other_platform}</bdi> : ts(`platforms.${platform}`)}
              >
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="inline-flex min-h-6 items-center gap-1 break-all underline underline-offset-2"
                  >
                    {link}
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-ink-3">{ts("noLink")}</span>
                )}
              </Fact>
            );
          })}
        </dl>
      ) : (
        <p className="text-ink-2 py-2 text-sm">{ts("nowhere")}</p>
      )}
    </section>
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

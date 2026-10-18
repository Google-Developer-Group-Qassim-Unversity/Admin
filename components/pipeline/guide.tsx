"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  CircleHelp,
  Crown,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { Count, Plate, SectionHead, Tarma } from "@/components/najdi";
import { PageHeader } from "@/components/page-header";
import { usePipelineRole } from "@/components/pipeline/roles";
import { STAGE_ICON, TEAM_ICON } from "@/components/pipeline/shared";
import { PIPELINE_DAY_STYLES, STAGE_TONE, StatePill, type PipelineDayStatus } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { PipelineMe } from "@/lib/pipeline-types";

/**
 * How the pipeline works, for staff: the five steps, the rules the backend
 * enforces (Backend/app/services/event_pipeline.py), where things are on the
 * page, and each role's part. The reader's own parts open by default. The
 * numbers here are the backend's constants; change them together.
 */
export function PipelineGuide({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline.guide");
  const role = usePipelineRole(me);

  const sections = ["path", "rules", "page", "roles", "calendar", "trouble"] as const;
  const mine: Record<GuideRole, boolean> = {
    department: role.ownDepartmentIds.size > 0,
    design: role.ownsTeam("design"),
    logistics: role.ownsTeam("logistics"),
    media: role.ownsTeam("media"),
    superAdmin: role.isSuperAdmin,
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link
          href="/pipeline"
          className="text-ink-2 hover:text-foreground -ms-1 flex min-h-11 w-fit items-center gap-1 rounded-sm px-1 text-sm font-bold transition-colors"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
        <PageHeader title={t("title")} description={t("subtitle")} icon={CircleHelp} />
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex max-w-[76ch] min-w-0 flex-col gap-12">
          <PathSection />
          <RulesSection />
          <PageSection showClub={role.isSuperAdmin} />
          <RolesSection mine={mine} />
          <CalendarSection />
          <TroubleSection />
        </div>

        <nav aria-labelledby="guide-toc" className="flex flex-col gap-1 max-lg:hidden lg:sticky lg:top-24">
          <h2 id="guide-toc" className="text-ink-2 border-foreground border-b pb-2 text-[12.5px] font-bold">
            {t("toc")}
          </h2>
          <ul className="flex flex-col">
            {sections.map((s) => (
              <li key={s}>
                <a
                  href={`#guide-${s}`}
                  className="text-ink-2 hover:text-foreground border-rule flex min-h-10 items-center border-b text-sm transition-colors"
                >
                  {t(`${s}.title`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

type GuideRole = "department" | "design" | "logistics" | "media" | "superAdmin";

/** Button and tab names in the copy, set in ink so the reader can find them on screen. */
const rich = { b: (chunks: React.ReactNode) => <b className="text-foreground font-bold">{chunks}</b> };

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={`guide-${id}`} aria-labelledby={`guide-${id}-title`} className="flex scroll-mt-24 flex-col gap-3">
      <SectionHead id={`guide-${id}-title`} title={title} />
      {intro ? <p className="text-ink-2 text-[15px] text-pretty">{intro}</p> : null}
      {children}
    </section>
  );
}

const PATH = ["draft", "in_review", "media", "ready", "published"] as const;

function PathSection() {
  const t = useTranslations("pipeline.guide.path");
  const ts = useTranslations("pipeline.stepNames");
  return (
    <Section id="path" title={t("title")} intro={t("intro")}>
      <ol className="flex flex-col">
        {PATH.map((stage, i) => (
          <li key={stage} className="border-rule flex gap-4 border-b py-4 max-sm:flex-col max-sm:gap-2">
            <div className="flex w-[104px] shrink-0 pt-1">
              <Tarma
                current={i}
                tone={STAGE_TONE[stage]}
                done={stage === "published"}
                label={`${ts(stage)} · ${i + 1} / ${PATH.length}`}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h3 className="text-[15px] font-bold">{ts(stage)}</h3>
                <span className="text-ink-2 text-[13px]">{t(`steps.${stage}.who`)}</span>
              </div>
              <p className="text-[15px] text-pretty">{t.rich(`steps.${stage}.body`, rich)}</p>
              {stage !== "published" ? (
                <p className="text-ink-2 flex items-start gap-1.5 text-sm">
                  <ArrowRight aria-hidden="true" className="mt-[3px] size-4 shrink-0 rtl:-scale-x-100" />
                  <span>{t.rich(`steps.${stage}.next`, rich)}</span>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <h3 className="mt-3 text-[15px] font-bold">{t("offPath")}</h3>
      <ul className="flex flex-col">
        {(["returned", "cancelled"] as const).map((stage) => (
          <li key={stage} className="border-rule flex items-start gap-3 border-b py-3">
            <Plate tone={STAGE_TONE[stage]} icon={STAGE_ICON[stage]} size="sm" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{t(`${stage}.title`)}</span>
              <p className="text-ink-2 text-sm text-pretty">{t.rich(`${stage}.body`, rich)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const RULES = ["lead", "length", "hold", "oneHold", "returnWindow", "fix", "penalty", "hours"] as const;

function RulesSection() {
  const t = useTranslations("pipeline.guide.rules");
  return (
    <Section id="rules" title={t("title")} intro={t("intro")}>
      <dl className="grid grid-cols-[max-content_1fr]">
        {RULES.map((rule) => (
          <React.Fragment key={rule}>
            <dt className="border-rule tabular max-w-[10rem] border-b py-3 pe-5 text-[15px] font-bold text-balance">{t(`items.${rule}.value`)}</dt>
            <dd className="border-rule text-ink-2 border-b py-3 text-sm text-pretty">{t.rich(`items.${rule}.text`, rich)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </Section>
  );
}

function PageSection({ showClub }: { showClub: boolean }) {
  const t = useTranslations("pipeline.guide.page");
  const rows: { key: string; icon: LucideIcon }[] = [
    { key: "department", icon: Building2 },
    { key: "desk", icon: Inbox },
    ...(showClub ? [{ key: "club", icon: Crown }] : []),
    { key: "calendar", icon: CalendarDays },
    { key: "book", icon: CalendarPlus },
    { key: "bell", icon: Bell },
  ];
  return (
    <Section id="page" title={t("title")} intro={t("intro")}>
      <ul className="flex flex-col">
        {rows.map(({ key, icon }) => (
          <li key={key} className="border-rule flex items-start gap-3 border-b py-3">
            <Plate tone="neutral" icon={icon} size="sm" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{t(`items.${key}.title`)}</span>
              <p className="text-ink-2 text-sm text-pretty">{t.rich(`items.${key}.body`, rich)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const ROLES: { key: GuideRole; icon: LucideIcon; steps: number }[] = [
  { key: "department", icon: Building2, steps: 5 },
  { key: "design", icon: TEAM_ICON.design, steps: 4 },
  { key: "logistics", icon: TEAM_ICON.logistics, steps: 5 },
  { key: "media", icon: TEAM_ICON.media, steps: 3 },
  { key: "superAdmin", icon: Crown, steps: 3 },
];

function RolesSection({ mine }: { mine: Record<GuideRole, boolean> }) {
  const t = useTranslations("pipeline.guide.roles");
  return (
    <Section id="roles" title={t("title")} intro={t("intro")}>
      <div className="flex flex-col">
        {ROLES.map(({ key, icon, steps }) => (
          <details key={key} open={mine[key]} className="group border-rule border-b">
            <summary className="hover:bg-card flex min-h-16 cursor-pointer list-none items-center gap-3 px-1 py-3 transition-colors [&::-webkit-details-marker]:hidden">
              <Plate tone="neutral" icon={icon} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">{t(`${key}.name`)}</span>
                  {mine[key] ? <StatePill tone="neutral">{t("yours")}</StatePill> : null}
                </span>
                <span className="text-ink-2 text-[13px]">{t(`${key}.who`)}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="text-ink-3 size-[18px] shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <ol className="flex flex-col gap-4 ps-1 pt-1 pb-5 sm:ps-12">
              {Array.from({ length: steps }, (_, i) => (
                <li key={i} className="flex gap-3">
                  <Count className="mt-px">{i + 1}</Count>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{t(`${key}.steps.${i}.title`)}</span>
                    <p className="text-ink-2 text-sm text-pretty">{t.rich(`${key}.steps.${i}.body`, rich)}</p>
                  </div>
                </li>
              ))}
              {key === "department" ? (
                <li className="text-ink-2 bg-sunk rounded-lg px-3 py-2.5 text-sm text-pretty">{t.rich("department.cancel", rich)}</li>
              ) : null}
            </ol>
          </details>
        ))}
      </div>
    </Section>
  );
}

const DAYS: PipelineDayStatus[] = ["open", "locked", "banned", "held", "booked", "published"];

function CalendarSection() {
  const t = useTranslations("pipeline.guide.calendar");
  const tc = useTranslations("pipeline.calendar.status");
  return (
    <Section id="calendar" title={t("title")} intro={t("intro")}>
      <ul className="flex flex-col">
        {DAYS.map((day) => (
          <li key={day} className="border-rule flex items-start gap-3 border-b py-3">
            <span aria-hidden="true" className={cn("mt-0.5 h-5 w-7 shrink-0 rounded-[2px]", PIPELINE_DAY_STYLES[day].dot)} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{tc(day)}</span>
              <p className="text-ink-2 text-sm text-pretty">{t(`days.${day}`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const TROUBLE = ["lost", "day", "hold", "submit", "change", "changed"] as const;

function TroubleSection() {
  const t = useTranslations("pipeline.guide.trouble");
  return (
    <Section id="trouble" title={t("title")}>
      <dl className="flex flex-col">
        {TROUBLE.map((item) => (
          <div key={item} className="border-rule flex flex-col gap-1 border-b py-3">
            <dt className="text-[15px] font-bold">{t(`items.${item}.q`)}</dt>
            <dd className="text-ink-2 text-sm text-pretty">{t.rich(`items.${item}.a`, rich)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

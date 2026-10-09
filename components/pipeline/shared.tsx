"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CornerUpLeft,
  DoorOpen,
  Lock,
  Megaphone,
  Palette,
  PencilLine,
  Send,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";

import { STAGE_STEP, STAGE_TONE } from "@/components/status-badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { usePipelineMe } from "@/hooks/use-pipeline";
import type { EventRequestStage, PipelineDepartment, PipelineMe, PipelineTeam } from "@/lib/pipeline-types";
import { intlLocale } from "@/lib/format";

/** A department's name in the reader's language. */
export function useDepartmentName() {
  const locale = useLocale();
  return React.useCallback(
    (department: Pick<PipelineDepartment, "name" | "ar_name"> | null | undefined) =>
      department ? (locale === "ar" ? department.ar_name : department.name) : "",
    [locale],
  );
}

/**
 * Renders its children only for someone who can use the pipeline, with the
 * caller's pipeline profile. The backend enforces every rule; this only saves
 * a person without access from a page of failed requests.
 */
export function PipelineGate({ children }: { children: (me: PipelineMe) => React.ReactNode }) {
  const t = useTranslations("pipeline");
  const { data: me, isPending, error } = usePipelineMe();

  if (isPending) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  if (error || !me?.has_access) {
    return (
      <Empty className="bg-card ring-rule rounded-xl border-0 ring-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>{t("noAccess.title")}</EmptyTitle>
          <EmptyDescription>{error ? error.message : t("noAccess.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <>{children(me)}</>;
}

/** "5–7 Oct" for a range of ISO days, in the reader's language. */
export function useFormatDateRange() {
  const locale = useLocale();
  return React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });
    return (start: string, end?: string | null) => {
      const from = new Date(`${start}T00:00:00Z`);
      if (!end || end === start) return formatter.format(from);
      return formatter.formatRange(from, new Date(`${end}T00:00:00Z`));
    };
  }, [locale]);
}

/**
 * The departments that are the caller's own: their roster departments. A super
 * admin acts for every department, so the pipeline's own list would be all of
 * them; the roster says which one they actually sit in. Falls back to every
 * acting department for someone on no roster (a super admin from outside).
 */
export function useOwnDepartmentIds(me: PipelineMe | undefined) {
  const { access } = useAccess();
  return React.useMemo(() => {
    const roster = new Set((access?.departments ?? []).map((d) => d.id));
    const acting = (me?.departments ?? []).map((d) => d.id).filter((id) => roster.has(id));
    return new Set(acting.length ? acting : (me?.departments ?? []).map((d) => d.id));
  }, [access, me]);
}

/** Whether the caller works on at least one pipeline team (or is a super admin). */
export function hasTeam(me: PipelineMe | undefined) {
  return Boolean(me && (me.is_super_admin || me.departments.some((d) => d.teams.length > 0)));
}

/** The icon on a request's plate, by stage. */
export const STAGE_ICON: Record<EventRequestStage, LucideIcon> = {
  draft: PencilLine,
  in_review: DoorOpen,
  returned: CornerUpLeft,
  media: Megaphone,
  ready: Send,
  published: Check,
  cancelled: X,
};

export const TEAM_ICON: Record<PipelineTeam, LucideIcon> = {
  design: Palette,
  logistics: Truck,
  media: Megaphone,
};

/** Props for `<Tarma>` that show where a request at `stage` stands. */
export function tarmaFor(stage: EventRequestStage) {
  return {
    current: Math.max(0, STAGE_STEP[stage]),
    tone: STAGE_TONE[stage],
    returned: stage === "returned",
    done: stage === "published",
  };
}

/** "Draft · Step 1 of 5", for screen readers and the door. */
export function useStageWords() {
  const t = useTranslations("pipeline");
  return (stage: EventRequestStage) =>
    stage === "published" || stage === "cancelled"
      ? t(`stage.${stage}`)
      : `${t(`stage.${stage}`)} · ${t("progress.step", { current: STAGE_STEP[stage] + 1, total: 5 })}`;
}

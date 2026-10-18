"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, Crown } from "lucide-react";

import { INK, Mark, Plate } from "@/components/najdi";
import { TEAM_ICON, useDepartmentName } from "@/components/pipeline/shared";
import { ROLE_TONE } from "@/components/status-badge";
import { useAccess } from "@/hooks/use-access";
import { isolate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  EventRequestStage,
  EventRequestSummary,
  PipelineDepartment,
  PipelineMe,
  PipelineTeam,
  TaskState,
} from "@/lib/pipeline-types";

/**
 * What in the pipeline is the caller's own, and what they only oversee.
 *
 * A super admin can act for every department and every team, but almost none
 * of it is theirs: a request waiting on Design waits on Design, whoever else
 * can press its buttons. So the screens ask two questions of every request,
 * "whose turn is it?" and "is that me?", and only a "yes" gets the painted,
 * waiting-on-you treatment. A super admin stepping in for someone else gets a
 * plain frame that names who the request is for (`BehalfFrame`).
 *
 * For everyone else "can act" and "is mine" are the same thing, so nothing
 * changes for them.
 */
export interface PipelineRole {
  isSuperAdmin: boolean;
  /** Departments the caller requests for through their own roster. */
  ownDepartmentIds: ReadonlySet<number>;
  /** Teams the caller works through their own roster, in pipeline order. */
  ownTeams: PipelineTeam[];
  /** Teams whose desks the caller can open: their own, or every team for a super admin. */
  deskTeams: PipelineTeam[];
  ownsDepartment: (departmentId: number) => boolean;
  ownsTeam: (team: PipelineTeam) => boolean;
}

export const TEAMS: PipelineTeam[] = ["design", "logistics", "media"];

export function usePipelineRole(me: PipelineMe | undefined): PipelineRole {
  const { access } = useAccess();
  return React.useMemo(() => {
    const isSuperAdmin = me?.is_super_admin === true;
    // `own_*` come from the backend; the fallback (an older backend) reads the
    // roster the same way: what the person sits on is theirs.
    const roster = new Set((access?.departments ?? []).map((d) => d.id));
    const ownDepartmentIds = new Set(
      me?.own_department_ids ??
        (me?.departments ?? []).map((d) => d.id).filter((id) => !isSuperAdmin || roster.has(id)),
    );
    const ownTeams =
      me?.own_teams ??
      TEAMS.filter((team) =>
        (me?.departments ?? []).some((d) => d.teams.includes(team) && (!isSuperAdmin || roster.has(d.id))),
      );
    const deskTeams = isSuperAdmin
      ? TEAMS.filter((team) => (me?.teams ?? []).some((entry) => entry.team === team))
      : ownTeams;
    return {
      isSuperAdmin,
      ownDepartmentIds,
      ownTeams,
      deskTeams,
      ownsDepartment: (id) => ownDepartmentIds.has(id),
      ownsTeam: (team) => ownTeams.includes(team),
    };
  }, [me, access]);
}

/** Whose move a request is waiting on. `null` once it is published or cancelled. */
export type Turn = { kind: "department" } | { kind: "teams"; teams: PipelineTeam[] } | null;

const DEPARTMENT_STAGES: ReadonlySet<EventRequestStage> = new Set(["draft", "returned", "ready"]);

export function whoseTurn(request: Pick<EventRequestSummary, "stage" | "task_states">): Turn {
  if (DEPARTMENT_STAGES.has(request.stage)) return { kind: "department" };
  if (request.stage === "media") return { kind: "teams", teams: ["media"] };
  if (request.stage === "in_review") {
    const states = request.task_states ?? [];
    const open = states.filter((s) => s.status === "open").map((s) => s.team);
    // Without task states (an older backend) both review teams are assumed to be at it.
    return { kind: "teams", teams: states.length ? open : ["design", "logistics"] };
  }
  return null;
}

/** Whether the request is waiting on the caller as themselves (not on someone they oversee). */
export function isMyTurn(role: PipelineRole, request: EventRequestSummary) {
  const turn = whoseTurn(request);
  if (!turn) return false;
  if (turn.kind === "department") return role.ownsDepartment(request.department.id);
  return turn.teams.some((team) => role.ownsTeam(team));
}

/** The party a request waits on, as a super admin acting for them would name it. */
export type Party = { kind: "team"; team: PipelineTeam } | { kind: "department"; department: PipelineDepartment };

const RoleContext = React.createContext<PipelineRole | null>(null);

/** Hands the reader's role to everything on a request's page. */
export function RoleProvider({ role, children }: { role: PipelineRole; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/**
 * Who the reader would be acting for if they used a control that belongs to
 * `party`: `party` itself when a super admin steps in for someone else, and
 * `null` when it is their own (or they are not a super admin, in which case
 * the backend only ever offers them their own controls).
 */
export function useBehalfOf(party: Party | null): Party | null {
  const role = React.useContext(RoleContext);
  if (!role?.isSuperAdmin || !party) return null;
  const mine = party.kind === "team" ? role.ownsTeam(party.team) : role.ownsDepartment(party.department.id);
  return mine ? null : party;
}

/** "Design", "Mobile Development": who a party is, in the reader's language. */
export function usePartyName() {
  const t = useTranslations("pipeline.teams");
  const departmentName = useDepartmentName();
  return React.useCallback(
    (party: Party) => (party.kind === "team" ? t(party.team) : departmentName(party.department)),
    [t, departmentName],
  );
}

/**
 * The super admin's seal: a madder stamp with a crown. Madder because it is a
 * caution, not a rank: these powers skip every rule, and what they do cannot
 * always be taken back. It appears on the top bar and wherever a super admin
 * is acting for someone else.
 */
export function SuperAdminSeal({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useTranslations("roles");
  return (
    <span
      className={cn(
        "plate-depth bg-door-madder text-on-door inline-flex h-7 shrink-0 items-center gap-1.5 rounded-t-[4px] rounded-b-[2px] text-[12.5px] leading-none font-bold",
        compact ? "w-7 justify-center" : "px-2.5",
        className,
      )}
    >
      <Crown className="size-[15px] shrink-0" strokeWidth={2} aria-hidden="true" />
      {compact ? <span className="sr-only">{t("superAdmin")}</span> : t("superAdmin")}
    </span>
  );
}

/**
 * A request seen by a super admin it is not waiting on: the plain wall, not a
 * painted door. It says who the request is for and that they know about it,
 * shows the same details and controls the owner sees, and sets the controls
 * apart under "act on their behalf" so stepping in is a decision, not a habit.
 */
export function BehalfFrame({
  party,
  title,
  note,
  actions,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  party: Party;
  title: React.ReactNode;
  /** One line under the title, e.g. how long it has waited. Defaults to "they have been told". */
  note?: React.ReactNode;
  /** The controls a super admin may use for them. Nothing renders below when absent. */
  actions?: React.ReactNode;
}) {
  const t = useTranslations("roles.behalf");
  const partyName = usePartyName();
  const name = partyName(party);
  const icon = party.kind === "team" ? TEAM_ICON[party.team] : Building2;

  return (
    <section className={cn("bg-card ring-rule overflow-hidden rounded-xl ring-1", className)} {...props}>
      <header className="flex items-start gap-3 px-4 pt-4 pb-3 sm:px-5">
        <Plate tone={party.kind === "team" ? "indigo" : "neutral"} icon={icon} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-ink-2 text-[12.5px] font-bold">
            {party.kind === "team" ? t("forTeam", { name: isolate(name) }) : t("forDepartment", { name: isolate(name) })}
          </span>
          <h2 className="text-[17px] leading-snug font-bold text-balance">{title}</h2>
          <p className="text-ink-2 text-[13.5px] text-pretty">
            {note ?? (party.kind === "team" ? t("teamKnows", { name: isolate(name) }) : t("departmentKnows", { name: isolate(name) }))}
          </p>
        </div>
      </header>
      {children ? <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">{children}</div> : null}
      {actions ? (
        <div className="bg-sunk border-rule flex flex-col gap-3 border-t px-4 py-3.5 sm:px-5">
          <p className="flex items-start gap-2 text-[13px] font-bold">
            <Crown className={cn("mt-px size-4 shrink-0", INK[ROLE_TONE.superAdmin])} aria-hidden="true" />
            <span>
              {t("actFor", { name: isolate(name) })}{" "}
              <span className="text-ink-2 font-medium">{t("recorded")}</span>
            </span>
          </p>
          {actions}
        </div>
      ) : null}
    </section>
  );
}

/**
 * One line that tells a super admin they are looking at someone else's work:
 * the crown in madder, then the sentence. Sits under a view's heading.
 */
export function BehalfNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "bg-door-madder-soft text-door-madder-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-pretty",
        className,
      )}
    >
      <Crown className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const TASK_MARK: Record<TaskState["status"], "indigo" | "green" | "madder" | "umber"> = {
  brief: "umber",
  open: "indigo",
  returned: "madder",
  done: "green",
};

/**
 * Who has a request now, for a list row. "Waiting on you" in ochre only when
 * it is the reader's own turn; a team's part is named with its state (a check
 * once done); a department's turn names the department. Nothing for a request
 * that is over.
 */
export function TurnLine({
  request,
  role,
  showDepartment = true,
  className,
}: {
  request: EventRequestSummary;
  role: PipelineRole;
  /** Name the department when it is the department's turn (off when every row is the reader's own department). */
  showDepartment?: boolean;
  className?: string;
}) {
  const t = useTranslations("pipeline");
  const tr = useTranslations("roles.turn");
  const departmentName = useDepartmentName();
  const turn = whoseTurn(request);
  if (!turn) return null;

  if (isMyTurn(role, request)) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 font-bold", INK.ochre, className)}>
        <Mark tone="ochre" className="size-2" />
        {turn.kind === "teams" ? tr("yourTeam") : tr("you")}
      </span>
    );
  }
  if (turn.kind === "department") {
    return (
      <span className={cn("text-ink-2 inline-flex items-center gap-1.5 font-bold", className)}>
        <Mark tone="neutral" className="size-2" />
        {showDepartment ? tr("withDepartment", { name: isolate(departmentName(request.department)) }) : tr("withYourDepartment")}
      </span>
    );
  }
  // A team step: name each team on it, and how far each has got.
  const states = request.stage === "in_review"
    ? (request.task_states ?? []).filter((s) => s.team !== "media")
    : (request.task_states ?? []).filter((s) => s.team === "media");
  const shown: TaskState[] = states.length
    ? states
    : turn.teams.map((team) => ({ team, status: "open", opened_at: null, done_at: null }));
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 font-bold", className)}>
      {shown.map((s) => (
        <span key={s.team} className={cn("inline-flex items-center gap-1", s.status === "done" ? INK.green : "text-ink-2")}>
          {s.status === "done" ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> : <Mark tone={TASK_MARK[s.status]} className="size-2" />}
          {t(`teams.${s.team}`)}
          <span className="sr-only"> · {t(`review.status.${s.status}`)}</span>
        </span>
      ))}
    </span>
  );
}

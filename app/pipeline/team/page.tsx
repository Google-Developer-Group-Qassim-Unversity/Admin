"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { KeyRound, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { PipelineGate, useDepartmentName } from "@/components/pipeline/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDepartmentPermissions,
  useGrantPermission,
  useRevokePermission,
  useSetPipelineTeams,
} from "@/hooks/use-pipeline";
import { useApi } from "@/lib/api/client";
import { PIPELINE_TEAMS, type PipelineMe, type PipelineTeam } from "@/lib/pipeline-types";

export default function PipelineTeamPage() {
  const t = useTranslations("pipeline.team");

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={KeyRound} />
      <PipelineGate>
        {(me) => (
          <>
            <DepartmentAccess me={me} />
            {me.is_super_admin ? <TeamMap me={me} /> : null}
          </>
        )}
      </PipelineGate>
    </div>
  );
}

function DepartmentAccess({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline.team");
  const departmentName = useDepartmentName();
  const [departmentId, setDepartmentId] = React.useState<number | null>(me.departments[0]?.id ?? null);
  const { data, isPending } = useDepartmentPermissions(departmentId);
  const grant = useGrantPermission(departmentId ?? 0);
  const revoke = useRevokePermission(departmentId ?? 0);
  const [candidate, setCandidate] = React.useState<string>("");

  const onGrant = async () => {
    if (!candidate) return;
    try {
      await grant.mutateAsync(Number(candidate));
      toast.success(t("granted"));
      setCandidate("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const onRevoke = async (grantId: number) => {
    try {
      await revoke.mutateAsync(grantId);
      toast.success(t("revoked"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("accessTitle")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("accessHint")}</p>
        </div>
        <Select value={departmentId ? String(departmentId) : ""} onValueChange={(v) => setDepartmentId(Number(v))}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t("pickDepartment")} />
          </SelectTrigger>
          <SelectContent>
            {me.departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {departmentName(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("officers")}</h3>
            {data.officers.length === 0 ? <p className="text-muted-foreground text-sm">{t("noOfficers")}</p> : null}
            {data.officers.map((o) => (
              <div key={`${o.member_id}-${o.role}`} className="border-border flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm">{o.name}</span>
                <Badge variant="secondary">{t(`roles.${o.role === "vp" ? "vp" : "leader"}`)}</Badge>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("grants")}</h3>
            {data.grants.length === 0 ? <p className="text-muted-foreground text-sm">{t("noGrants")}</p> : null}
            {data.grants.map((g) => (
              <div key={g.id} className="border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{g.name}</span>
                  <span className="text-muted-foreground text-xs">{t("grantedBy", { name: g.granted_by.name })}</span>
                </div>
                {data.can_grant ? (
                  <Button size="sm" variant="ghost" onClick={() => onRevoke(g.id)} disabled={revoke.isPending}>
                    <UserMinus className="h-4 w-4" />
                    {t("revoke")}
                  </Button>
                ) : null}
              </div>
            ))}

            {data.can_grant ? (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Select value={candidate} onValueChange={setCandidate}>
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue placeholder={t("pickMember")} />
                  </SelectTrigger>
                  <SelectContent>
                    {data.candidates.map((c) => (
                      <SelectItem key={c.member_id} value={String(c.member_id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={onGrant} disabled={!candidate || grant.isPending}>
                  <UserPlus className="h-4 w-4" />
                  {t("grant")}
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground pt-2 text-xs">{t("onlyOfficersGrant")}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Super admins choose which department is Design, Logistics and Media. */
function TeamMap({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline.team");
  const tt = useTranslations("pipeline.teams");
  const api = useApi();
  const departmentName = useDepartmentName();
  const setTeams = useSetPipelineTeams();
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: () => api.departments.list() });

  const initial = React.useMemo(() => {
    const map: Partial<Record<PipelineTeam, string>> = {};
    for (const entry of me.teams) map[entry.team] = String(entry.department.id);
    return map;
  }, [me.teams]);
  const [choice, setChoice] = React.useState(initial);
  React.useEffect(() => setChoice(initial), [initial]);

  const onSave = async () => {
    try {
      await setTeams.mutateAsync({
        design: choice.design ? Number(choice.design) : null,
        logistics: choice.logistics ? Number(choice.logistics) : null,
        media: choice.media ? Number(choice.media) : null,
      });
      toast.success(t("teamsSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">{t("teamsTitle")}</h2>
        <p className="text-muted-foreground text-[13px]">{t("teamsHint")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PIPELINE_TEAMS.map((team) => (
          <div key={team} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{tt(team)}</span>
            <Select value={choice[team] ?? ""} onValueChange={(v) => setChoice((c) => ({ ...c, [team]: v }))}>
              <SelectTrigger>
                <SelectValue placeholder={t("notSet")} />
              </SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {departmentName(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div>
        <Button onClick={onSave} disabled={setTeams.isPending}>
          {t("saveTeams")}
        </Button>
      </div>
    </section>
  );
}

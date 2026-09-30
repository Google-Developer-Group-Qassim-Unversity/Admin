"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { PipelineGate, useDepartmentName } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetPipelineTeams } from "@/hooks/use-pipeline";
import { useApi } from "@/lib/api/client";
import { PIPELINE_TEAMS, type PipelineMe, type PipelineTeam } from "@/lib/pipeline-types";

export default function PipelineTeamPage() {
  const t = useTranslations("pipeline.team");

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={KeyRound} />
      <PipelineGate>
        {(me) =>
          me.is_super_admin ? (
            <TeamMap me={me} />
          ) : (
            <p className="text-muted-foreground text-sm">{t("onlySuperAdmins")}</p>
          )
        }
      </PipelineGate>
    </div>
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

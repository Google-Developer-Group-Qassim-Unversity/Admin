"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Crown, ShieldPlus, UserMinus } from "lucide-react";
import { Plate } from "@/components/najdi";
import { toast } from "sonner";

import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { Button } from "@/components/ui/button";
import { MemberDetailsTrigger } from "@/components/member-details";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { useAddSuperAdmin, useRemoveSuperAdmin, useSuperAdmins } from "@/hooks/use-permissions";
import type { SuperAdminEntry } from "@/lib/permissions-types";
import { isolate } from "@/lib/format";

/** Super admins can do anything; they add and remove each other here. */
export function SuperAdminsPanel() {
  const t = useTranslations("permissions.superAdmins");
  const format = useFormatter();
  const { access } = useAccess();
  const { data } = useSuperAdmins(true);
  const add = useAddSuperAdmin();
  const remove = useRemoveSuperAdmin();
  const [picking, setPicking] = React.useState(false);
  const [removing, setRemoving] = React.useState<SuperAdminEntry | null>(null);

  if (!data) return <Skeleton className="h-40 w-full" />;

  const onAdd = async (memberId: number) => {
    setPicking(false);
    try {
      await add.mutateAsync(memberId);
      toast.success(t("added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const onRemove = async () => {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.member_id);
      toast.success(t("removed"));
      setRemoving(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="border-foreground flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold">{t("title")}</h2>
          <p className="text-ink-2 max-w-[70ch] text-[13px]">{t("hint")}</p>
        </div>
        <Button onClick={() => setPicking(true)} disabled={add.isPending}>
          <ShieldPlus className="h-4 w-4" />
          {t("add")}
        </Button>
      </div>
      <ul className="-mt-4 flex flex-col">
        {data.map((row) => (
          <li key={row.member_id} className="border-rule flex min-h-16 items-center gap-3 border-b px-1 py-2.5">
            <Plate tone="indigo" icon={Crown} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-bold">
                <MemberDetailsTrigger member={{ id: row.member_id, name: row.name }} />
              </span>
              <span className="text-ink-2 text-xs">
                {row.added_by
                  ? t("addedBy", { name: isolate(row.added_by.name), date: format.dateTime(new Date(row.added_at), { dateStyle: "medium" }) })
                  : t("addedByScript", { date: format.dateTime(new Date(row.added_at), { dateStyle: "medium" }) })}
              </span>
            </div>
            {row.member_id !== access?.member_id && data.length > 1 ? (
              <Button size="sm" variant="destructive" onClick={() => setRemoving(row)}>
                <UserMinus className="h-4 w-4" />
                {t("remove")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {picking ? (
        <ClubMemberPicker
          title={t("add")}
          excludedIds={data.map((row) => row.member_id)}
          onClose={() => setPicking(false)}
          onSelect={(member) => void onAdd(member.id)}
        />
      ) : null}
      {removing ? (
        <ConfirmChange
          title={t("removeConfirm", { name: isolate(removing.name) })}
          description={t("removeHint")}
          pending={remove.isPending}
          onConfirm={() => void onRemove()}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </section>
  );
}

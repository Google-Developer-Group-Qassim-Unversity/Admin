"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { MemberAvatar } from "@/components/club-structure/shared";
import { MemberDetailsTrigger } from "@/components/member-details";
import { useClubMutation } from "@/hooks/use-club-structure";
import type { ClubMember, ClubRoleKey } from "@/lib/club-structure-types";
import { Mark } from "@/components/najdi";
import { useClubError } from "@/components/club-structure/use-club-error";

/** What the confirmation is about to do: give the role to `member`, or take it from `previous`. */
type PendingChange = { member: ClubMember | null; previous: ClubMember | null };

/**
 * The seats of one officer role (leader, VP) in one department for one semester.
 *
 * Every holder can be replaced or cleared; while seats are free there is an
 * "Assign" slot. Replacing names the holder, so a stale screen cannot take a
 * seat from someone it did not show. Nobody loses their membership here.
 */
export function RoleSeatCard({
  semesterId,
  departmentId,
  role,
  label,
  maxHolders,
  holders,
  canEdit,
  disabled = false,
}: {
  semesterId: string;
  departmentId: number;
  role: ClubRoleKey;
  label: string;
  maxHolders: number | null;
  holders: ClubMember[];
  canEdit: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  const [picker, setPicker] = useState<{ previous: ClubMember | null } | null>(null);
  const [change, setChange] = useState<PendingChange | null>(null);
  const mutation = useClubMutation(
    async (api, pending: PendingChange): Promise<void> => {
      if (pending.member) {
        await api.grantRole(semesterId, departmentId, pending.member.id, role, pending.previous?.id ?? null);
      } else if (pending.previous) {
        await api.revokeRole(semesterId, departmentId, pending.previous.id, role);
      }
    },
  );
  const hasFreeSeat = maxHolders === null || holders.length < maxHolders;

  async function confirm() {
    if (!change || disabled) return;
    try {
      await mutation.mutateAsync(change);
      setChange(null);
      toast.success(t("assignmentSaved"));
    } catch {
      // Keep the dialog open; the user must close and review before retrying.
    }
  }

  return (
    <section aria-label={label} className="min-w-0">
      <h3 className="border-foreground flex items-center gap-2 border-b pb-2 text-base font-bold">
        {maxHolders === null ? label : t("seatCount", { role: label, count: holders.length, max: maxHolders })}
      </h3>
      <ul className="flex flex-col">
        {holders.map((holder) => (
          <li key={holder.id} className="border-rule flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-1 py-2">
            <MemberDetailsTrigger member={holder} className="flex min-w-0 items-center gap-3">
              <MemberAvatar name={holder.name} />
              <bdi className="min-w-0 text-sm font-bold wrap-anywhere group-hover/member:underline">{holder.name}</bdi>
            </MemberDetailsTrigger>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || mutation.isPending}
                  onClick={() => setPicker({ previous: holder })}
                >
                  {t("replace")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled || mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setChange({ member: null, previous: holder });
                  }}
                >
                  {t("clear")}
                </Button>
              </div>
            )}
          </li>
        ))}
        {hasFreeSeat && (
          <li className="border-rule flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-1 py-2">
            <p className="text-door-ochre-ink flex items-center gap-2 text-sm font-bold">
              <Mark tone="ochre" />
              {t("vacant")}
            </p>
            {canEdit && (
              <Button
                size="sm"
                variant="ochre"
                disabled={disabled || mutation.isPending}
                onClick={() => setPicker({ previous: null })}
              >
                {t("assign")}
              </Button>
            )}
          </li>
        )}
      </ul>
      {picker && canEdit && (
        <ClubMemberPicker
          title={label}
          excludedIds={holders.map((holder) => holder.id)}
          onClose={() => setPicker(null)}
          onSelect={(member) => {
            mutation.reset();
            setChange({ member, previous: picker.previous });
          }}
        />
      )}
      {change && canEdit && (
        <ConfirmChange
          title={
            change.member
              ? change.previous
                ? t("replaceConfirm", { name: change.member.name, previous: change.previous.name, role: label })
                : t("assignConfirm", { name: change.member.name, role: label })
              : t("clearConfirm", { name: change.previous?.name ?? "", role: label })
          }
          description={t("leadershipChangeHint")}
          pending={mutation.isPending}
          disabled={disabled}
          error={mutation.error ? `${describeError(mutation.error, true)} ${t("reviewBeforeRetry")}` : undefined}
          onConfirm={() => void confirm()}
          onClose={() => {
            setChange(null);
            mutation.reset();
          }}
        />
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { MemberAvatar } from "@/components/club-structure/shared";
import { useClubMutation } from "@/hooks/use-club-structure";
import type { ClubAssignment, LeadershipRole, PresidentSlot, ReplaceClubAssignment } from "@/lib/club-structure-types";
import { cn } from "@/lib/utils";
import { useClubError } from "@/components/club-structure/use-club-error";

type Seat = { slot: PresidentSlot } | { departmentId: number; role: LeadershipRole };
type PendingChange = { member: { id: number; name: string } | null; previous: ClubAssignment | null };

export function SeatCard({
  seat,
  assignment,
  canEdit,
  disabled = false,
  excludedIds = [],
}: {
  seat: Seat;
  assignment: ClubAssignment | null;
  canEdit: boolean;
  disabled?: boolean;
  excludedIds?: number[];
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  const [picker, setPicker] = useState<{ previous: ClubAssignment | null } | null>(null);
  const [change, setChange] = useState<PendingChange | null>(null);
  const mutation = useClubMutation((api, payload: ReplaceClubAssignment) =>
    "slot" in seat
      ? api.replacePresident(seat.slot, payload)
      : api.replaceLeadership(seat.departmentId, seat.role, payload),
  );
  const isPresident = "slot" in seat;
  const title = isPresident ? t("presidentSeat", { slot: seat.slot }) : t(`roles.${seat.role}`);

  async function confirm() {
    if (!change || disabled) return;
    try {
      await mutation.mutateAsync({
        member_id: change.member?.id ?? null,
        // Capture the tenure when the picker opens, not after a background refresh.
        expected_assignment_id: change.previous?.id ?? null,
      });
      setChange(null);
      toast.success(t("assignmentSaved"));
    } catch {
      // Keep the original expectation; the user must close and review before retrying.
    }
  }

  return (
    <section aria-label={title} className={cn("min-w-0 rounded-xl border bg-card p-4", !assignment && "border-dashed")}>
      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {assignment ? (
          <div className="flex min-w-0 items-center gap-3">
            <MemberAvatar name={assignment.member.name} />
            <bdi className="min-w-0 wrap-anywhere text-sm font-medium">{assignment.member.name}</bdi>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">{t("vacant")}</p>
        )}
        {canEdit && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={disabled || mutation.isPending}
              className="min-h-10 sm:min-h-0"
              variant={assignment ? "outline" : "default"}
              onClick={() => setPicker({ previous: assignment })}
            >
              {assignment ? t("replace") : t("assign")}
            </Button>
            {assignment && (
              <Button
                size="sm"
                disabled={disabled || mutation.isPending}
                className="min-h-10 sm:min-h-0"
                variant="ghost"
                onClick={() => {
                  mutation.reset();
                  setChange({ member: null, previous: assignment });
                }}
              >
                {t("clear")}
              </Button>
            )}
          </div>
        )}
      </div>
      {picker && canEdit && (
        <ClubMemberPicker
          title={title}
          excludedIds={[...excludedIds, ...(picker.previous ? [picker.previous.member_id] : [])]}
          onClose={() => setPicker(null)}
          onSelect={([member]) => {
            if (!member) return;
            mutation.reset();
            setChange({ member, previous: picker.previous });
          }}
        />
      )}
      {change && canEdit && (
        <ConfirmChange
          title={
            change.member
              ? t("assignConfirm", { name: change.member.name, role: title })
              : t("clearConfirm", { role: title })
          }
          description={isPresident ? t("presidentChangeHint") : t("leadershipChangeHint")}
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

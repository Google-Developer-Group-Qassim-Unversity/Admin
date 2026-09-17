"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { MemberSelectDialog } from "@/components/member-select-dialog";
import { useMembers } from "@/hooks/use-members";
import type { Member } from "@/lib/api-types";
import { useClubError } from "@/components/club-structure/use-club-error";

const EMPTY_IDS: number[] = [];

export function ClubMemberPicker({
  title,
  excludedIds,
  multiple = false,
  onSelect,
  onClose,
}: {
  title: string;
  excludedIds: number[];
  multiple?: boolean;
  onSelect: (members: Pick<Member, "id" | "name">[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  const { getToken } = useAuth();
  const members = useMembers(getToken);
  const options = useMemo(
    () =>
      (members.data ?? [])
        .filter((member) => !excludedIds.includes(member.id))
        .map((member) => ({ id: member.id, label: member.name, email: member.email, uni_id: member.uni_id })),
    [members.data, excludedIds],
  );

  return (
    <MemberSelectDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={t(multiple ? "chooseMembers" : "chooseMember")}
      maxSelections={multiple ? undefined : 1}
      allowCreate={false}
      memberOptions={options}
      selectedIds={EMPTY_IDS}
      isLoading={members.isPending}
      error={describeError(members.error)}
      emptyMessage={t("noEligibleMembers")}
      applyLabel={multiple ? (count) => t("addMembers", { count }) : t("selectMember")}
      onRetry={() => void members.refetch()}
      onSelectionChange={(ids) => {
        const selected = ids
          .map((id) => members.data?.find((item) => item.id === id))
          .filter((member): member is Member => member !== undefined);
        if (selected.length) onSelect(selected);
      }}
    />
  );
}

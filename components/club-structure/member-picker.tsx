"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { MemberSelectDialog } from "@/components/member-select-dialog";
import { useMembers } from "@/hooks/use-members";
import type { Member } from "@/lib/api-types";

const EMPTY_IDS: number[] = [];

export function ClubMemberPicker({
  title,
  excludedIds,
  onSelect,
  onClose,
}: {
  title: string;
  excludedIds: number[];
  onSelect: (member: Pick<Member, "id" | "name">) => void;
  onClose: () => void;
}) {
  const t = useTranslations("clubStructure");
  const members = useMembers();
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
      description={t("chooseMember")}
      maxSelections={1}
      allowCreate={false}
      memberOptions={options}
      selectedIds={EMPTY_IDS}
      isLoading={members.isPending}
      error={members.error?.message}
      onRetry={() => void members.refetch()}
      onSelectionChange={(ids) => {
        const member = members.data?.find((item) => item.id === ids[0]);
        if (member) onSelect(member);
      }}
    />
  );
}

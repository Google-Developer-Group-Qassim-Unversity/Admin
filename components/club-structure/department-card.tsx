"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DepartmentIcon,
  DepartmentTypeBadge,
  MemberAvatar,
  useDepartmentName,
} from "@/components/club-structure/shared";
import type { ClubDepartmentCard } from "@/lib/club-structure-types";

export function DepartmentCard({
  department,
  onOpen,
  canEdit,
}: {
  department: ClubDepartmentCard;
  onOpen: () => void;
  canEdit: boolean;
}) {
  const t = useTranslations("clubStructure");
  const name = useDepartmentName();
  return (
    <article className="flex min-w-0 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/25">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <DepartmentIcon {...department} />
          <div className="min-w-0 space-y-1">
            <h3 className="wrap-anywhere text-sm font-semibold" dir="auto">
              {name(department)}
            </h3>
            <DepartmentTypeBadge type={department.type} />
          </div>
        </div>
        {!department.active && <Badge variant="secondary">{t("archived")}</Badge>}
      </div>
      <div className="mb-4 flex-1 space-y-2">
        {department.leadership_enabled ? (
          (["leader", "deputy"] as const).map((role) => (
            <div key={role} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 text-muted-foreground">{t(`roles.${role}`)}</span>
              {department[role] ? (
                <>
                  <MemberAvatar small name={department[role].member.name} />
                  <bdi className="min-w-0 wrap-anywhere">{department[role].member.name}</bdi>
                </>
              ) : (
                <span className="italic text-muted-foreground">{t("vacant")}</span>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">{t("departmentRosterHint", { name: name(department) })}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">{t("memberCount", { count: department.member_count })}</p>
        <Button
          size="sm"
          className="min-h-10 sm:min-h-0"
          onClick={onOpen}
          aria-label={t(canEdit ? "manageDepartment" : "viewDepartment", { name: name(department) })}
        >
          {t(canEdit ? "manage" : "view")}
          <ArrowRight className="size-3.5 rtl:rotate-180" />
        </Button>
      </div>
    </article>
  );
}

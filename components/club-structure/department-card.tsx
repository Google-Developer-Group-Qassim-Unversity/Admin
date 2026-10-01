"use client";

import { ArrowRight, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DepartmentIcon,
  DepartmentTypeBadge,
  MemberAvatar,
  useDepartmentName,
} from "@/components/club-structure/shared";
import { MemberDetailsTrigger } from "@/components/member-details";
import type { ClubDepartmentCard, ClubRoleKey } from "@/lib/club-structure-types";

export function DepartmentCard({
  department,
  roleName,
  onOpen,
  canEdit,
}: {
  department: ClubDepartmentCard;
  roleName: (key: ClubRoleKey) => string;
  onOpen: () => void;
  canEdit: boolean;
}) {
  const t = useTranslations("clubStructure");
  const name = useDepartmentName();
  return (
    <article className="flex min-w-0 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/25">
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <DepartmentIcon {...department} />
        <div className="min-w-0 space-y-1">
          <h3 className="wrap-anywhere text-sm font-semibold" dir="auto">
            {name(department)}
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            <DepartmentTypeBadge type={department.type} />
            {!department.active && <Badge variant="secondary">{t("archived")}</Badge>}
            {!department.show_in_leaderboard && (
              <Badge variant="outline" className="gap-1 text-[10px]" title={t("hiddenFromLeaderboardHint")}>
                <EyeOff className="size-3" aria-hidden="true" />
                {t("hiddenFromLeaderboard")}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="mb-4 flex-1 space-y-2">
        {department.roles.map((seats) =>
          seats.holders.length ? (
            seats.holders.map((holder) => (
              <div key={`${seats.key}-${holder.id}`} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-muted-foreground">{roleName(seats.key)}</span>
                <MemberDetailsTrigger member={holder} className="flex min-w-0 items-center gap-2">
                  <MemberAvatar small name={holder.name} />
                  <bdi className="min-w-0 wrap-anywhere group-hover/member:underline">{holder.name}</bdi>
                </MemberDetailsTrigger>
              </div>
            ))
          ) : (
            <div key={seats.key} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 text-muted-foreground">{roleName(seats.key)}</span>
              <span className="italic text-muted-foreground">{t("vacant")}</span>
            </div>
          ),
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

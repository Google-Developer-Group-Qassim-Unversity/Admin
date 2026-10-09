"use client";

import { ChevronRight, EyeOff } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * One department as a row on the wall: its own coloured door, its name and
 * type, who holds its seats, how many members it has, and the way in. On a
 * phone the seats drop under the name.
 */
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
    <article
      className={cn(
        "border-rule grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 border-b px-1 py-4 lg:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.4fr)_auto] lg:items-center",
        !department.active && "opacity-75",
      )}
    >
      <DepartmentIcon {...department} />
      <div className="min-w-0 space-y-1.5">
        <h3 className="text-[15px] leading-snug font-bold wrap-anywhere" dir="auto">
          {name(department)}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <DepartmentTypeBadge type={department.type} />
          {!department.active && <Badge variant="secondary">{t("archived")}</Badge>}
          {!department.show_in_leaderboard && (
            <Badge variant="outline" title={t("hiddenFromLeaderboardHint")}>
              <EyeOff aria-hidden="true" />
              {t("hiddenFromLeaderboard")}
            </Badge>
          )}
          <span className="text-ink-2 text-[13px] tabular">· {t("memberCount", { count: department.member_count })}</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="row-span-1 shrink-0 lg:col-start-4"
        onClick={onOpen}
        aria-label={t(canEdit ? "manageDepartment" : "viewDepartment", { name: name(department) })}
      >
        {t(canEdit ? "manage" : "view")}
        <ChevronRight className="size-4 rtl:-scale-x-100" />
      </Button>
      <ul className="col-span-3 grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 ps-[52px] lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:ps-0">
        {department.roles.map((seats) =>
          seats.holders.length ? (
            seats.holders.map((holder, index) => (
              <li key={`${seats.key}-${holder.id}`} className="contents">
                <span className={cn("text-ink-2 self-center text-[13px]", index > 0 && "invisible")}>{roleName(seats.key)}</span>
                <span className="min-w-0">
                  <MemberDetailsTrigger member={holder} className="flex min-w-0 items-center gap-2 text-[13.5px]">
                    <MemberAvatar small name={holder.name} />
                    <bdi className="min-w-0 truncate font-medium underline-offset-2 group-hover/member:underline">
                      {holder.name}
                    </bdi>
                  </MemberDetailsTrigger>
                </span>
              </li>
            ))
          ) : (
            <li key={seats.key} className="contents">
              <span className="text-ink-2 text-[13px]">{roleName(seats.key)}</span>
              <span className="text-door-ochre-ink text-[13px] font-bold">{t("vacant")}</span>
            </li>
          ),
        )}
      </ul>
    </article>
  );
}

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crown, Settings, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ClubTabsList, ClubTabsTrigger } from "@/components/club-structure/club-tabs";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { DepartmentForm } from "@/components/club-structure/department-form";
import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { SeatCard } from "@/components/club-structure/seat-card";
import {
  DepartmentIcon,
  ClubLoading,
  ClubRefresh,
  DepartmentTypeBadge,
  MemberAvatar,
  QueryError,
  RoleBadge,
  useDepartmentName,
} from "@/components/club-structure/shared";
import { useClubDepartment, useClubMutation, useClubRoster } from "@/hooks/use-club-structure";
import type { ClubAssignment, ClubDepartment, DepartmentSettings } from "@/lib/club-structure-types";
import { normalizeArabic } from "@/lib/search-utils";
import { useClubError } from "@/components/club-structure/use-club-error";

function DepartmentRoster({
  department,
  assignments,
  canEdit,
  disabled,
}: {
  department: ClubDepartment;
  assignments: ClubAssignment[];
  canEdit: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const [removing, setRemoving] = useState<ClubAssignment | null>(null);
  const add = useClubMutation((api, memberId: number) => api.addMember(department.id, memberId));
  const remove = useClubMutation((api, assignment: ClubAssignment) =>
    api.removeMember(department.id, assignment.member_id, assignment.id),
  );
  const visible = assignments.filter((assignment) =>
    normalizeArabic(assignment.member.name).includes(normalizeArabic(search.trim())),
  );

  async function addMember(id: number) {
    if (disabled) return;
    try {
      await add.mutateAsync(id);
      toast.success(t("memberAdded"));
    } catch {
      /* Display below the toolbar. */
    }
  }
  async function removeMember() {
    if (!removing || disabled) return;
    try {
      await remove.mutateAsync(removing);
      setRemoving(null);
      toast.success(t("memberRemoved"));
    } catch {
      /* Keep the confirmation open. */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-0 flex-1 basis-40"
          aria-label={t("searchMembers")}
          placeholder={t("searchMembers")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canEdit && (
          <Button
            size="sm"
            disabled={disabled || add.isPending || remove.isPending}
            className="min-h-10 sm:min-h-0"
            onClick={() => {
              add.reset();
              setPicker(true);
            }}
          >
            <UserPlus className="size-4" />
            {t("addMember")}
          </Button>
        )}
      </div>
      {add.error && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(add.error, true)}
        </p>
      )}
      {add.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("addingMember")}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("memberCount", { count: assignments.length })}</p>
      {visible.length ? (
        <ul className="space-y-1">
          {visible.map((assignment) => (
            <li key={assignment.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
              <MemberAvatar name={assignment.member.name} />
              <div className="min-w-0 flex-1">
                <p className="wrap-anywhere text-sm font-medium" dir="auto">
                  {assignment.member.name}
                </p>
                <RoleBadge role={assignment.role} />
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-10 shrink-0 text-destructive sm:min-h-0"
                  disabled={disabled || remove.isPending || add.isPending}
                  aria-label={t("removeMemberNamed", {
                    name: assignment.member.name,
                  })}
                  onClick={() => {
                    remove.reset();
                    setRemoving(assignment);
                  }}
                >
                  {t("remove")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 py-10 text-center text-sm text-muted-foreground">
          <p>{t(search.trim() ? "noMembersFound" : "noRosterMembers")}</p>
          {search.trim() && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              {t("clearSearch")}
            </Button>
          )}
        </div>
      )}
      {picker && canEdit && (
        <ClubMemberPicker
          title={t("addMember")}
          excludedIds={assignments.map((assignment) => assignment.member_id)}
          onClose={() => setPicker(false)}
          onSelect={(member) => void addMember(member.id)}
        />
      )}
      {removing && canEdit && (
        <ConfirmChange
          title={t("removeConfirm", { name: removing.member.name })}
          description={t("removeHint")}
          pending={remove.isPending}
          disabled={disabled}
          error={remove.error ? `${describeError(remove.error, true)} ${t("reviewBeforeRetry")}` : undefined}
          onConfirm={() => void removeMember()}
          onClose={() => {
            setRemoving(null);
            remove.reset();
          }}
        />
      )}
    </div>
  );
}

function DepartmentSettingsPanel({
  department,
  canEdit,
  disabled,
}: {
  department: ClubDepartment;
  canEdit: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  // Capture the intended status: a refresh must not reverse an open confirmation.
  const [nextActive, setNextActive] = useState<boolean | null>(null);
  const update = useClubMutation((api, settings: DepartmentSettings) => api.updateDepartment(department.id, settings));
  const status = useClubMutation((api, active: boolean) => api.setActive(department.id, active));
  async function save(settings: DepartmentSettings) {
    try {
      await update.mutateAsync(settings);
      toast.success(t("settingsSaved"));
      return true;
    } catch {
      /* Preserve the form on error. */
      return false;
    }
  }
  async function changeStatus() {
    if (nextActive === null || disabled) return;
    try {
      await status.mutateAsync(nextActive);
      setNextActive(null);
      toast.success(t(nextActive ? "departmentRestored" : "departmentArchived"));
    } catch {
      /* Keep the confirmation open. */
    }
  }
  return (
    <div className="space-y-6">
      {update.error && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(update.error, true)}
        </p>
      )}
      <DepartmentForm
        initial={department}
        pending={update.isPending || status.isPending}
        readOnly={!canEdit}
        disabled={disabled}
        submitLabel={t("saveChanges")}
        onSubmit={save}
      />
      {canEdit && (
        <div className="space-y-3 border-t pt-5">
          <h3 className="text-xs font-semibold text-muted-foreground">{t("departmentStatus")}</h3>
          <Button
            className="w-full"
            variant="outline"
            disabled={disabled || update.isPending || status.isPending}
            onClick={() => {
              status.reset();
              setNextActive(!department.active);
            }}
          >
            {t(department.active ? "archiveDepartment" : "restoreDepartment")}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("archiveHint")}</p>
        </div>
      )}
      {nextActive !== null && canEdit && (
        <ConfirmChange
          title={t(nextActive ? "restoreDepartment" : "archiveDepartment")}
          description={t(nextActive ? "restoreHint" : "archiveHint")}
          pending={status.isPending}
          disabled={disabled}
          error={describeError(status.error, true)}
          onConfirm={() => void changeStatus()}
          onClose={() => {
            setNextActive(null);
            status.reset();
          }}
        />
      )}
    </div>
  );
}

export function DepartmentDrawer({ id, canEdit, onClose }: { id: number; canEdit: boolean; onClose: () => void }) {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const [tab, setTab] = useState("roster");
  const locale = useLocale();
  const name = useDepartmentName();
  const department = useClubDepartment(id);
  const roster = useClubRoster(id);
  const current = department.data;
  const assignments = roster.data ?? [];
  const canChangeRoster = canEdit && !!current?.active;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={locale === "ar" ? "left" : "right"}
        className="w-full! sm:max-w-[480px]! gap-0"
        closeLabel={common("actions.close")}
      >
        <SheetHeader className="border-b p-6 pe-12">
          <div className="flex items-center gap-3">
            {current && <DepartmentIcon {...current} />}
            <div className="min-w-0 space-y-1">
              <SheetTitle className="wrap-anywhere">{current ? name(current) : t("department")}</SheetTitle>
              <SheetDescription>{t("drawerDescription")}</SheetDescription>
              {current && (
                <div className="flex flex-wrap gap-2">
                  <DepartmentTypeBadge type={current.type} />
                  {!current.active && <Badge variant="secondary">{t("archived")}</Badge>}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <ClubRefresh />
          </div>
        </SheetHeader>
        {department.isPending && (
          <div className="p-6">
            <ClubLoading />
          </div>
        )}
        {department.error && (
          <div className="p-6">
            <QueryError error={department.error} retry={() => void department.refetch()} stale={!!current} />
          </div>
        )}
        {current && (
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="min-h-0 flex-1 gap-0"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <ClubTabsList className="shrink-0 gap-0">
              <ClubTabsTrigger value="roster" className="flex-1">
                <Users aria-hidden="true" />
                {t("roster")}
              </ClubTabsTrigger>
              {current.leadership_enabled && (
                <ClubTabsTrigger value="leadership" className="flex-1">
                  <Crown aria-hidden="true" />
                  {t("leadership")}
                </ClubTabsTrigger>
              )}
              <ClubTabsTrigger value="settings" className="flex-1">
                <Settings aria-hidden="true" />
                {t("settings")}
              </ClubTabsTrigger>
            </ClubTabsList>
            {!current.active && (
              <p className="border-b bg-muted/40 px-6 py-3 text-xs text-muted-foreground">{t("archivedRosterHint")}</p>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <TabsContent value="roster">
                {roster.isPending && <ClubLoading />}
                {roster.error && (
                  <QueryError error={roster.error} retry={() => void roster.refetch()} stale={!!roster.data} />
                )}
                {roster.data && (
                  <DepartmentRoster
                    department={current}
                    assignments={assignments}
                    canEdit={canChangeRoster}
                    disabled={!!department.error || !!roster.error}
                  />
                )}
              </TabsContent>
              {current.leadership_enabled && (
                <TabsContent value="leadership" className="space-y-4">
                  {roster.isPending && <ClubLoading />}
                  {roster.error && (
                    <QueryError error={roster.error} retry={() => void roster.refetch()} stale={!!roster.data} />
                  )}
                  {roster.data && (
                    <>
                      {(["leader", "deputy"] as const).map((role) => (
                        <SeatCard
                          key={role}
                          seat={{ departmentId: id, role }}
                          assignment={assignments.find((assignment) => assignment.role === role) ?? null}
                          canEdit={canChangeRoster}
                          disabled={!!department.error || !!roster.error}
                          excludedIds={assignments
                            .filter((assignment) => assignment.role !== "member")
                            .map((assignment) => assignment.member_id)}
                        />
                      ))}
                      <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                        {t("leadershipChangeHint")}
                      </p>
                    </>
                  )}
                </TabsContent>
              )}
              <TabsContent value="settings" forceMount className={tab !== "settings" ? "hidden" : undefined}>
                <DepartmentSettingsPanel department={current} canEdit={canEdit} disabled={!!department.error} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

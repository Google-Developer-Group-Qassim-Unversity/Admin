"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { DepartmentForm } from "@/components/club-structure/department-form";
import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { SeatCard } from "@/components/club-structure/seat-card";
import {
  DepartmentIcon,
  DepartmentTypeBadge,
  MemberAvatar,
  QueryError,
  RoleBadge,
  useDepartmentName,
} from "@/components/club-structure/shared";
import { useClubDepartment, useClubMutation, useClubRoster } from "@/hooks/use-club-structure";
import type { ClubAssignment, ClubDepartment, DepartmentSettings } from "@/lib/club-structure-types";

function DepartmentRoster({
  department,
  assignments,
  canEdit,
}: {
  department: ClubDepartment;
  assignments: ClubAssignment[];
  canEdit: boolean;
}) {
  const t = useTranslations("clubStructure");
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const [removing, setRemoving] = useState<ClubAssignment | null>(null);
  const add = useClubMutation((api, memberId: number) => api.addMember(department.id, memberId));
  const remove = useClubMutation((api, assignment: ClubAssignment) =>
    api.removeMember(department.id, assignment.member_id, assignment.id),
  );
  const visible = assignments.filter((assignment) =>
    assignment.member.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );

  async function addMember(id: number) {
    try {
      await add.mutateAsync(id);
      toast.success(t("memberAdded"));
    } catch {
      /* Display below the toolbar. */
    }
  }
  async function removeMember() {
    if (!removing) return;
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
      <div className="flex items-center gap-2">
        <Input
          aria-label={t("searchMembers")}
          placeholder={t("searchMembers")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canEdit && (
          <Button
            size="sm"
            disabled={add.isPending}
            onClick={() => {
              add.reset();
              setPicker(true);
            }}
          >
            <Plus className="size-4" />
            {t("addMember")}
          </Button>
        )}
      </div>
      {add.error && (
        <p role="alert" className="text-sm text-destructive">
          {add.error.message}
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
                <p className="break-words text-sm font-medium" dir="auto">
                  {assignment.member.name}
                </p>
                <RoleBadge role={assignment.role} />
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={remove.isPending}
                  aria-label={t("removeMemberNamed", { name: assignment.member.name })}
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
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t(search.trim() ? "noMembersFound" : "noRosterMembers")}
        </p>
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
          error={remove.error ? `${remove.error.message} ${t("reviewBeforeRetry")}` : undefined}
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

function DepartmentSettingsPanel({ department, canEdit }: { department: ClubDepartment; canEdit: boolean }) {
  const t = useTranslations("clubStructure");
  const [changingStatus, setChangingStatus] = useState(false);
  const update = useClubMutation((api, settings: DepartmentSettings) => api.updateDepartment(department.id, settings));
  const status = useClubMutation((api, active: boolean) => api.setActive(department.id, active));
  async function save(settings: DepartmentSettings) {
    try {
      await update.mutateAsync(settings);
      toast.success(t("settingsSaved"));
    } catch {
      /* Preserve the form on error. */
    }
  }
  async function changeStatus() {
    try {
      await status.mutateAsync(!department.active);
      setChangingStatus(false);
      toast.success(t(department.active ? "departmentArchived" : "departmentRestored"));
    } catch {
      /* Keep the confirmation open. */
    }
  }
  return (
    <div className="space-y-6">
      {update.error && (
        <p role="alert" className="text-sm text-destructive">
          {update.error.message}
        </p>
      )}
      <DepartmentForm
        key={`${department.id}-${department.updated_at}`}
        initial={department}
        pending={update.isPending}
        readOnly={!canEdit}
        submitLabel={t("saveChanges")}
        onSubmit={(settings) => void save(settings)}
      />
      {canEdit && (
        <div className="space-y-3 border-t pt-5">
          <h3 className="text-xs font-semibold text-muted-foreground">{t("departmentStatus")}</h3>
          <Button
            className="w-full"
            variant="outline"
            disabled={update.isPending || status.isPending}
            onClick={() => {
              status.reset();
              setChangingStatus(true);
            }}
          >
            {t(department.active ? "archiveDepartment" : "restoreDepartment")}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("archiveHint")}</p>
        </div>
      )}
      {changingStatus && canEdit && (
        <ConfirmChange
          title={t(department.active ? "archiveDepartment" : "restoreDepartment")}
          description={t(department.active ? "archiveHint" : "restoreHint")}
          pending={status.isPending}
          error={status.error?.message}
          onConfirm={() => void changeStatus()}
          onClose={() => {
            setChangingStatus(false);
            status.reset();
          }}
        />
      )}
    </div>
  );
}

export function DepartmentDrawer({ id, canEdit, onClose }: { id: number; canEdit: boolean; onClose: () => void }) {
  const t = useTranslations("clubStructure");
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
      <SheetContent side={locale === "ar" ? "left" : "right"} className="w-full! sm:max-w-[480px]! gap-0">
        <SheetHeader className="border-b p-6 pe-12">
          <div className="flex items-center gap-3">
            {current && <DepartmentIcon {...current} />}
            <div className="min-w-0 space-y-1">
              <SheetTitle className="break-words">{current ? name(current) : t("department")}</SheetTitle>
              <SheetDescription>{t("drawerDescription")}</SheetDescription>
              {current && (
                <div className="flex flex-wrap gap-2">
                  <DepartmentTypeBadge type={current.type} />
                  {!current.active && <Badge variant="secondary">{t("archived")}</Badge>}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>
        {department.isPending && (
          <div className="p-6">
            <Skeleton className="h-48" />
          </div>
        )}
        {department.error && (
          <div className="p-6">
            <QueryError error={department.error} retry={() => void department.refetch()} />
          </div>
        )}
        {current && !department.error && (
          <Tabs defaultValue="roster" className="min-h-0 flex-1 gap-0" dir={locale === "ar" ? "rtl" : "ltr"}>
            <TabsList variant="line" className="w-full shrink-0 rounded-none border-b px-6 py-3">
              <TabsTrigger value="roster">{t("roster")}</TabsTrigger>
              {current.leadership_enabled && <TabsTrigger value="leadership">{t("leadership")}</TabsTrigger>}
              <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
            </TabsList>
            {!current.active && (
              <p className="border-b bg-muted/40 px-6 py-3 text-xs text-muted-foreground">{t("archivedRosterHint")}</p>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <TabsContent value="roster">
                {roster.isPending ? (
                  <Skeleton className="h-48" />
                ) : roster.error ? (
                  <QueryError error={roster.error} retry={() => void roster.refetch()} />
                ) : (
                  <DepartmentRoster department={current} assignments={assignments} canEdit={canChangeRoster} />
                )}
              </TabsContent>
              {current.leadership_enabled && (
                <TabsContent value="leadership" className="space-y-4">
                  {roster.isPending ? (
                    <Skeleton className="h-48" />
                  ) : roster.error ? (
                    <QueryError error={roster.error} retry={() => void roster.refetch()} />
                  ) : (
                    <>
                      {(["leader", "deputy"] as const).map((role) => (
                        <SeatCard
                          key={role}
                          seat={{ departmentId: id, role }}
                          assignment={assignments.find((assignment) => assignment.role === role) ?? null}
                          canEdit={canChangeRoster}
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
              <TabsContent value="settings">
                <DepartmentSettingsPanel department={current} canEdit={canEdit} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

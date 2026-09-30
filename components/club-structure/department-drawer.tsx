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
import { RoleSeatCard } from "@/components/club-structure/seat-card";
import {
  DepartmentIcon,
  ClubLoading,
  ClubRefresh,
  DepartmentTypeBadge,
  MemberAvatar,
  QueryError,
  RoleBadge,
  useDepartmentName,
  useRoleName,
} from "@/components/club-structure/shared";
import { useClubDepartment, useClubMutation, useClubRoster } from "@/hooks/use-club-structure";
import type {
  ClubDepartment,
  ClubDepartmentCard,
  ClubRole,
  ClubSemester,
  DepartmentSettings,
  RosterEntry,
} from "@/lib/club-structure-types";
import { normalizeArabic } from "@/lib/search-utils";
import { useClubError } from "@/components/club-structure/use-club-error";

function DepartmentRoster({
  semester,
  department,
  entries,
  roleName,
  canEdit,
  disabled,
}: {
  semester: ClubSemester;
  department: ClubDepartment;
  entries: RosterEntry[];
  roleName: (key: string) => string;
  canEdit: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const [removing, setRemoving] = useState<RosterEntry | null>(null);
  const add = useClubMutation((api, memberId: number) => api.addMember(semester.id, department.id, memberId));
  const remove = useClubMutation((api, entry: RosterEntry) =>
    api.removeMember(semester.id, department.id, entry.member.id),
  );
  const visible = entries.filter((entry) =>
    normalizeArabic(entry.member.name).includes(normalizeArabic(search.trim())),
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
          type="search"
          inputMode="search"
          enterKeyHint="search"
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
      <p className="text-xs text-muted-foreground">{t("memberCount", { count: entries.length })}</p>
      {visible.length ? (
        <ul className="space-y-1">
          {visible.map((entry) => (
            <li key={entry.member.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
              <MemberAvatar name={entry.member.name} />
              <div className="min-w-0 flex-1">
                <p className="wrap-anywhere text-sm font-medium" dir="auto">
                  {entry.member.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {entry.roles.map((role) => (
                    <RoleBadge key={role} role={role} label={roleName(role)} />
                  ))}
                </div>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-10 shrink-0 text-destructive sm:min-h-0"
                  disabled={disabled || remove.isPending || add.isPending}
                  aria-label={t("removeMemberNamed", { name: entry.member.name })}
                  onClick={() => {
                    remove.reset();
                    setRemoving(entry);
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
          excludedIds={entries.map((entry) => entry.member.id)}
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
  semester,
  department,
  inSemester,
  canEdit,
  disabled,
  onRemoved,
}: {
  semester: ClubSemester;
  department: ClubDepartment;
  inSemester: boolean;
  canEdit: boolean;
  disabled: boolean;
  onRemoved: () => void;
}) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  // Capture the intended status: a refresh must not reverse an open confirmation.
  const [nextActive, setNextActive] = useState<boolean | null>(null);
  const [removing, setRemoving] = useState(false);
  const update = useClubMutation((api, settings: DepartmentSettings) => api.updateDepartment(department.id, settings));
  const status = useClubMutation((api, active: boolean) => api.setActive(department.id, active));
  const leave = useClubMutation((api) => api.removeFromSemester(semester.id, department.id));
  const busy = update.isPending || status.isPending || leave.isPending;

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
  async function removeFromSemester() {
    try {
      await leave.mutateAsync(undefined);
      setRemoving(false);
      toast.success(t("removedFromSemester", { semester: semester.name }));
      onRemoved();
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
        pending={busy}
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
            disabled={disabled || busy}
            onClick={() => {
              status.reset();
              setNextActive(!department.active);
            }}
          >
            {t(department.active ? "archiveDepartment" : "restoreDepartment")}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("archiveHint")}</p>
          {inSemester && (
            <>
              <Button
                className="w-full"
                variant="outline"
                disabled={disabled || busy}
                onClick={() => {
                  leave.reset();
                  setRemoving(true);
                }}
              >
                {t("removeFromSemester", { semester: semester.name })}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">{t("removeFromSemesterHint")}</p>
            </>
          )}
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
      {removing && canEdit && (
        <ConfirmChange
          title={t("removeFromSemester", { semester: semester.name })}
          description={t("removeFromSemesterHint")}
          pending={leave.isPending}
          disabled={disabled}
          error={describeError(leave.error, true)}
          onConfirm={() => void removeFromSemester()}
          onClose={() => {
            setRemoving(false);
            leave.reset();
          }}
        />
      )}
    </div>
  );
}

export function DepartmentDrawer({
  id,
  semester,
  card,
  roles,
  canEdit,
  onClose,
}: {
  id: number;
  semester: ClubSemester;
  /** The department as part of this semester; undefined when it is not part of it. */
  card: ClubDepartmentCard | undefined;
  roles: ClubRole[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const [tab, setTab] = useState(card ? "roster" : "settings");
  const locale = useLocale();
  const name = useDepartmentName();
  const roleName = useRoleName(roles);
  const department = useClubDepartment(id);
  const roster = useClubRoster(id, semester.id);
  const current = department.data;
  const entries = roster.data ?? [];
  const canChangeRoster = canEdit && !!card;
  const disabled = !!department.error || !!roster.error;

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
        <SheetHeader className="border-b p-4 pe-12 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6 sm:pe-12">
          <div className="flex items-center gap-3">
            {current && <DepartmentIcon {...current} />}
            <div className="min-w-0 space-y-1">
              <SheetTitle className="wrap-anywhere">
                {current ? name({ ...current, ...(card ?? {}) }) : t("department")}
              </SheetTitle>
              <SheetDescription>{t("drawerDescription", { semester: semester.name })}</SheetDescription>
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
          <div className="p-4 sm:p-6">
            <ClubLoading />
          </div>
        )}
        {department.error && (
          <div className="p-4 sm:p-6">
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
              {card && (
                <ClubTabsTrigger value="roster" className="min-w-0 flex-1 basis-0">
                  <Users aria-hidden="true" />
                  {t("roster")}
                </ClubTabsTrigger>
              )}
              {card && card.roles.length > 0 && (
                <ClubTabsTrigger value="leadership" className="min-w-0 flex-1 basis-0">
                  <Crown aria-hidden="true" />
                  {t("leadership")}
                </ClubTabsTrigger>
              )}
              <ClubTabsTrigger value="settings" className="min-w-0 flex-1 basis-0">
                <Settings aria-hidden="true" />
                {t("settings")}
              </ClubTabsTrigger>
            </ClubTabsList>
            {!card && (
              <p className="border-b bg-muted/40 px-4 py-3 text-xs sm:px-6 text-muted-foreground">
                {t("notInSemesterHint", { semester: semester.name })}
              </p>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
              {card && (
                <TabsContent value="roster">
                  {roster.isPending && <ClubLoading />}
                  {roster.error && (
                    <QueryError error={roster.error} retry={() => void roster.refetch()} stale={!!roster.data} />
                  )}
                  {roster.data && (
                    <DepartmentRoster
                      semester={semester}
                      department={current}
                      entries={entries}
                      roleName={roleName}
                      canEdit={canChangeRoster}
                      disabled={disabled}
                    />
                  )}
                </TabsContent>
              )}
              {card && (
                <TabsContent value="leadership" className="space-y-4">
                  {roster.isPending && <ClubLoading />}
                  {roster.error && (
                    <QueryError error={roster.error} retry={() => void roster.refetch()} stale={!!roster.data} />
                  )}
                  {roster.data && (
                    <>
                      {card.roles.map((seats) => (
                        <RoleSeatCard
                          key={seats.key}
                          semesterId={semester.id}
                          departmentId={id}
                          role={seats.key}
                          label={roleName(seats.key)}
                          maxHolders={seats.max_holders}
                          holders={entries.filter((entry) => entry.roles.includes(seats.key)).map((entry) => entry.member)}
                          canEdit={canChangeRoster}
                          disabled={disabled}
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
                <DepartmentSettingsPanel
                  semester={semester}
                  department={current}
                  inSemester={!!card}
                  canEdit={canEdit}
                  disabled={!!department.error}
                  onRemoved={onClose}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

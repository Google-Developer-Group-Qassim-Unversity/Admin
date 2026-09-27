"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Copy, Network, Plus, Search } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { DepartmentCard } from "@/components/club-structure/department-card";
import { DepartmentDrawer } from "@/components/club-structure/department-drawer";
import {
  ClubLoading,
  ClubRefresh,
  DepartmentPlusIcon,
  QueryError,
  useDepartmentName,
  useRoleName,
} from "@/components/club-structure/shared";
import { useClubError } from "@/components/club-structure/use-club-error";
import { useClubMutation, useClubOverview } from "@/hooks/use-club-structure";
import { useUserRole } from "@/hooks/use-rbac";
import { useSemesters } from "@/hooks/use-semesters";
import type { Semester } from "@/lib/api-types";
import type { ClubOverview } from "@/lib/club-structure-types";
import { normalizeArabic } from "@/lib/search-utils";

export function ClubStructureContent() {
  return (
    <Suspense fallback={<ClubLoading overview />}>
      <ClubStructureOverview />
    </Suspense>
  );
}

function semesterLabel(semester: Pick<Semester, "name" | "hijri_code" | "gregorian_code">) {
  return `${semester.name} (${semester.hijri_code} · ${semester.gregorian_code})`;
}

/** Start an empty semester from another semester's departments and roster. */
function CopyStructure({ overview, semesters }: { overview: ClubOverview; semesters: Semester[] }) {
  const t = useTranslations("clubStructure");
  const describeError = useClubError();
  const target = overview.semester;
  // Default to the semester that came right before this one.
  const sources = semesters.filter((semester) => semester.id !== target.id);
  const previous = sources.find((semester) => semester.start_date < target.start_date) ?? sources[0];
  const [sourceId, setSourceId] = useState<string | undefined>(previous?.id);
  const [confirming, setConfirming] = useState(false);
  const copy = useClubMutation((api, source: string) => api.copyFrom(target.id, source));
  const source = sources.find((semester) => semester.id === sourceId);
  if (!sources.length) return null;

  async function run() {
    if (!source) return;
    try {
      const result = await copy.mutateAsync(source.id);
      setConfirming(false);
      toast.success(t("structureCopied", { count: result.copied, source: source.name }));
    } catch {
      /* Keep the confirmation open. */
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-dashed p-4" aria-labelledby="club-copy">
      <div>
        <h2 id="club-copy" className="text-sm font-semibold">
          {t("copyTitle", { semester: target.name })}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("copyHint")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="w-full sm:w-72" aria-label={t("copySource")}>
            <SelectValue placeholder={t("copySource")} />
          </SelectTrigger>
          <SelectContent>
            {sources.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semesterLabel(semester)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!source || copy.isPending}
          onClick={() => {
            copy.reset();
            setConfirming(true);
          }}
        >
          <Copy className="size-4" aria-hidden="true" />
          {t("copyAction")}
        </Button>
      </div>
      {confirming && source && (
        <ConfirmChange
          title={t("copyConfirm", { source: source.name, target: target.name })}
          description={t("copyHint")}
          pending={copy.isPending}
          error={describeError(copy.error, true)}
          onConfirm={() => void run()}
          onClose={() => {
            setConfirming(false);
            copy.reset();
          }}
        />
      )}
    </section>
  );
}

/** Add an existing (active) department to the selected semester. */
function AddDepartmentToSemester({ overview }: { overview: ClubOverview }) {
  const t = useTranslations("clubStructure");
  const name = useDepartmentName();
  const describeError = useClubError();
  const [departmentId, setDepartmentId] = useState<string>("");
  const add = useClubMutation((api, id: number) => api.addToSemester(overview.semester.id, id));
  if (!overview.available_departments.length) return null;

  async function submit() {
    if (!departmentId) return;
    try {
      await add.mutateAsync(Number(departmentId));
      setDepartmentId("");
      toast.success(t("addedToSemester", { semester: overview.semester.name }));
    } catch {
      /* Shown below. */
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-full sm:w-64" aria-label={t("addDepartmentToSemester")}>
            <SelectValue placeholder={t("addDepartmentToSemester")} />
          </SelectTrigger>
          <SelectContent>
            {overview.available_departments.map((department) => (
              <SelectItem key={department.id} value={String(department.id)}>
                {name(department)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={!departmentId || add.isPending} onClick={() => void submit()}>
          <Plus className="size-4" aria-hidden="true" />
          {t("add")}
        </Button>
      </div>
      {add.error && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(add.error, true)}
        </p>
      )}
    </div>
  );
}

function ClubStructureOverview() {
  const t = useTranslations("clubStructure");
  const denied = useTranslations("accessDenied");
  const format = useFormatter();
  const { isLoaded } = useUser();
  const role = useUserRole();
  const canEdit = role === "super_admin";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // No ?semester= means the current semester, which the API picks.
  const requestedSemester = searchParams.get("semester") ?? undefined;
  const requestedId = Number(searchParams.get("department"));
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isSafeInteger(requestedId) && requestedId > 0 ? requestedId : null,
  );
  const overview = useClubOverview(requestedSemester);
  const semesters = useSemesters();
  const roleName = useRoleName(overview.data?.roles ?? []);

  const departments = useMemo(
    () =>
      [...(overview.data?.departments ?? [])].sort(
        // The club leadership first, then by id - the order departments were created in.
        (a, b) => Number(b.is_club_leadership) - Number(a.is_club_leadership) || a.id - b.id,
      ),
    [overview.data],
  );

  if (!isLoaded) return <ClubLoading overview />;
  if (role === "none")
    return <AccessDenied title={denied("fallbackTitle")} description={denied("fallbackDescription")} />;

  const semester = overview.data?.semester;
  const visible = departments.filter((department) =>
    normalizeArabic(
      `${department.name} ${department.ar_name} ${department.semester_name ?? ""} ${department.semester_ar_name ?? ""}`,
    ).includes(normalizeArabic(search.trim())),
  );
  const selectSemester = (id: string) => {
    setSelectedId(null);
    router.replace(`${pathname}?semester=${id}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={semester?.id} onValueChange={selectSemester} disabled={!semesters.data}>
            <SelectTrigger className="w-full sm:w-64" aria-label={t("semester")}>
              <SelectValue placeholder={t("semester")} />
            </SelectTrigger>
            <SelectContent>
              {(semesters.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {semesterLabel(item)}
                  {item.is_current ? ` · ${t("current")}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ClubRefresh />
          {canEdit && semester && (
            <Button asChild>
              <Link href={`/club-structure/create?semester=${semester.id}`} className="flex items-center gap-2">
                <DepartmentPlusIcon />
                {t("newDepartment")}
              </Link>
            </Button>
          )}
        </div>
      </div>
      {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>}
      {overview.error && (
        <QueryError error={overview.error} stale={!!overview.data} retry={() => void overview.refetch()} />
      )}
      {!overview.data && !overview.error && <ClubLoading overview />}
      {overview.data && semester && (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[
              { label: t("semesterDepartments", { semester: semester.name }), value: departments.length },
              { label: t("active"), value: departments.filter((department) => department.active).length },
              { label: t("totalMembers"), value: overview.data.total_members },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card px-4 py-3.5">
                <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{format.number(stat.value)}</dd>
              </div>
            ))}
          </dl>
          {canEdit && overview.data.total_members === 0 && semesters.data && (
            <CopyStructure key={semester.id} overview={overview.data} semesters={semesters.data} />
          )}
          <section aria-label={t("departments")} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
              {canEdit ? <AddDepartmentToSemester key={semester.id} overview={overview.data} /> : <span />}
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  className="ps-9"
                  aria-label={t("searchDepartments")}
                  placeholder={t("searchDepartments")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            {visible.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((department) => (
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    roleName={roleName}
                    canEdit={canEdit}
                    onOpen={() => setSelectedId(department.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
                <Network className="mb-4 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {search.trim() ? t("noDepartmentsFound") : t("noSemesterDepartments", { semester: semester.name })}
                </p>
                {search.trim() && (
                  <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>
                    {t("clearSearch")}
                  </Button>
                )}
              </div>
            )}
          </section>
          {selectedId !== null && (
            <DepartmentDrawer
              key={`${semester.id}-${selectedId}`}
              id={selectedId}
              semester={semester}
              card={departments.find((department) => department.id === selectedId)}
              roles={overview.data.roles}
              canEdit={canEdit}
              onClose={() => setSelectedId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

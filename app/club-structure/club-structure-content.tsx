"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Copy, Network, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmChange } from "@/components/club-structure/confirm-change";
import { PageHeader } from "@/components/page-header";
import { Plate } from "@/components/najdi";
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
import { useAccess } from "@/hooks/use-access";
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
    <section
      className="bg-door-ochre-soft text-door-ochre-ink space-y-3 rounded-xl p-4 shadow-[inset_0_0_0_1px_var(--door-ochre)] sm:p-5"
      aria-labelledby="club-copy"
    >
      <div className="flex items-start gap-3">
        <Plate tone="ochre" icon={Copy} size="sm" />
        <div>
          <h2 id="club-copy" className="text-foreground text-base font-bold">
            {t("copyTitle", { semester: target.name })}
          </h2>
          <p className="mt-1 text-sm">{t("copyHint")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="w-full min-w-0 sm:w-80" aria-label={t("copySource")}>
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
          variant="ochre"
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
    <div className="w-full min-w-0 space-y-1 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-full min-w-0 sm:w-64" aria-label={t("addDepartmentToSemester")}>
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
        <p role="alert" className="text-door-madder-ink text-sm">
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
  const { can, isLoading } = useAccess();
  const canEdit = can("club_structure.manage");
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

  if (isLoading) return <ClubLoading overview />;
  if (!can("club_structure.view"))
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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Network}>
        {/* Phones: the semester picker takes its own full-width row above the
            two actions; from sm everything sits on the header's trailing side. */}
        <div className="flex w-full flex-wrap items-center gap-2 *:flex-1 sm:w-auto sm:*:flex-none">
          <Select value={semester?.id} onValueChange={selectSemester} disabled={!semesters.data}>
            <SelectTrigger className="w-full min-w-0 max-sm:basis-full! sm:w-72" aria-label={t("semester")}>
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
      </PageHeader>
      {!canEdit && <p className="text-ink-2 text-sm">{t("readOnlyHint")}</p>}
      {overview.error && (
        <QueryError error={overview.error} stale={!!overview.data} retry={() => void overview.refetch()} />
      )}
      {!overview.data && !overview.error && <ClubLoading overview />}
      {overview.data && semester && (
        <>
          {/* One quiet strip of numbers, not a row of tiles; on a phone, one line of text. */}
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[13px] sm:bg-card sm:ring-rule sm:grid sm:grid-cols-3 sm:overflow-hidden sm:rounded-xl sm:ring-1">
            {[
              { label: t("semesterDepartments", { semester: semester.name }), value: departments.length },
              { label: t("active"), value: departments.filter((department) => department.active).length },
              { label: t("totalMembers"), value: overview.data.total_members },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-rule flex min-w-0 items-baseline gap-1 after:ps-0.5 after:content-['·'] last:after:content-none sm:flex-col-reverse sm:items-stretch sm:gap-0.5 sm:border-e sm:px-5 sm:py-3 sm:after:content-none sm:last:border-e-0"
              >
                <dt className="leading-snug sm:text-[13px]">{stat.label}</dt>
                <dd className="text-foreground font-bold tabular-nums max-sm:order-first sm:text-[21px] sm:leading-tight">
                  {format.number(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
          {canEdit && overview.data.total_members === 0 && semesters.data && (
            <CopyStructure key={semester.id} overview={overview.data} semesters={semesters.data} />
          )}
          <section aria-label={t("departments")} className="flex flex-col gap-2">
            <div className="border-foreground flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              {canEdit ? <AddDepartmentToSemester key={semester.id} overview={overview.data} /> : <span />}
              <div className="relative w-full sm:w-64">
                <Search
                  className="text-ink-2 pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  className="ps-9"
                  aria-label={t("searchDepartments")}
                  placeholder={t("searchDepartments")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            {visible.length ? (
              <div className="flex flex-col">
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
              <div className="border-adobe mt-2 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
                <Plate tone="neutral" icon={Network} />
                <p className="text-ink-2 max-w-sm text-sm">
                  {search.trim() ? t("noDepartmentsFound") : t("noSemesterDepartments", { semester: semester.name })}
                </p>
                {search.trim() && (
                  <Button variant="outline" onClick={() => setSearch("")}>
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

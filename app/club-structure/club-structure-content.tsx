"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Archive, Building2, Network, Search } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { AccessDenied } from "@/components/ui/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ClubTabsList, ClubTabsTrigger } from "@/components/club-structure/club-tabs";
import { DepartmentCard } from "@/components/club-structure/department-card";
import { DepartmentDrawer } from "@/components/club-structure/department-drawer";
import { SeatCard } from "@/components/club-structure/seat-card";
import { ClubLoading, ClubRefresh, DepartmentPlusIcon, QueryError } from "@/components/club-structure/shared";
import { useClubOverview } from "@/hooks/use-club-structure";
import { useUserRole } from "@/hooks/use-rbac";
import { normalizeArabic } from "@/lib/search-utils";

export function ClubStructureContent() {
  return (
    <Suspense fallback={<ClubLoading overview />}>
      <ClubStructureOverview />
    </Suspense>
  );
}

function ClubStructureOverview() {
  const t = useTranslations("clubStructure");
  const denied = useTranslations("accessDenied");
  const format = useFormatter();
  const locale = useLocale();
  const { isLoaded } = useUser();
  const role = useUserRole();
  const canEdit = role === "super_admin";
  const searchParams = useSearchParams();
  const requestedId = Number(searchParams.get("department"));
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isSafeInteger(requestedId) && requestedId > 0 ? requestedId : null,
  );
  // Active membership is the headline count. The inclusive overview supplies archive cards and counts.
  const overview = useClubOverview();
  const allDepartments = useClubOverview(true);

  if (!isLoaded) return <ClubLoading overview />;
  if (role === "none")
    return <AccessDenied title={denied("fallbackTitle")} description={denied("fallbackDescription")} />;
  const departments = allDepartments.data?.departments ?? [];
  const activeCount = departments.filter((department) => department.active).length;
  const archivedCount = departments.length - activeCount;
  const visible = departments.filter(
    (department) =>
      department.active === (filter === "active") &&
      normalizeArabic(`${department.name} ${department.ar_name}`).includes(normalizeArabic(search.trim())),
  );
  const error = overview.error ?? allDepartments.error;
  const hasData = !!overview.data && !!allDepartments.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClubRefresh />
          {canEdit && (
            <Button asChild>
              <Link href="/club-structure/create" className="flex items-center gap-2">
                <DepartmentPlusIcon />
                {t("newDepartment")}
              </Link>
            </Button>
          )}
        </div>
      </div>
      {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>}
      {error && (
        <QueryError
          error={error}
          stale={hasData}
          retry={() => {
            void overview.refetch();
            void allDepartments.refetch();
          }}
        />
      )}
      {!hasData && !error && <ClubLoading overview />}
      {overview.data && allDepartments.data && (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: t("totalDepartments"), value: departments.length },
              { label: t("active"), value: activeCount },
              { label: t("archived"), value: archivedCount },
              { label: t("totalMembers"), value: overview.data.total_members },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card px-4 py-3.5">
                <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{format.number(stat.value)}</dd>
              </div>
            ))}
          </dl>
          <section className="space-y-3" aria-labelledby="club-presidents">
            <div>
              <h2 id="club-presidents" className="text-base font-semibold">
                {t("presidents")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("presidentsHint")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {overview.data.presidents.map((seat) => (
                <SeatCard
                  key={seat.slot}
                  seat={{ slot: seat.slot }}
                  assignment={seat.assignment}
                  canEdit={canEdit}
                  disabled={!!overview.error}
                  excludedIds={overview.data.presidents.flatMap((item) =>
                    item.assignment ? [item.assignment.member_id] : [],
                  )}
                />
              ))}
            </div>
          </section>
          <section aria-label={t("departments")}>
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as "active" | "archived")}
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="gap-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b">
                <ClubTabsList className="w-auto border-0" aria-label={t("departmentStatus")}>
                  {(["active", "archived"] as const).map((value) => (
                    <ClubTabsTrigger key={value} value={value}>
                      {value === "active" ? <Building2 aria-hidden="true" /> : <Archive aria-hidden="true" />}
                      {t("statusCount", {
                        status: t(value),
                        count: value === "active" ? activeCount : archivedCount,
                      })}
                    </ClubTabsTrigger>
                  ))}
                </ClubTabsList>
                <div className="relative mb-2 w-full sm:w-64">
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
              <TabsContent value={filter}>
                {visible.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((department) => (
                      <DepartmentCard
                        key={department.id}
                        department={department}
                        canEdit={canEdit}
                        onOpen={() => setSelectedId(department.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
                    <Network className="mb-4 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t(
                        search.trim()
                          ? "noDepartmentsFound"
                          : filter === "active"
                            ? "noActiveDepartments"
                            : "noArchivedDepartments",
                      )}
                    </p>
                    {search.trim() && (
                      <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>
                        {t("clearSearch")}
                      </Button>
                    )}
                    {canEdit && filter === "active" && !search.trim() && (
                      <Button className="mt-4" asChild>
                        <Link href="/club-structure/create" className="flex items-center gap-2">
                          <DepartmentPlusIcon />
                          {t("createFirstDepartment")}
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </>
      )}
      {selectedId !== null && (
        <DepartmentDrawer key={selectedId} id={selectedId} canEdit={canEdit} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

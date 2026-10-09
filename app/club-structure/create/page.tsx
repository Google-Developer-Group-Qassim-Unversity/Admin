"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";
import { Button } from "@/components/ui/button";
import { Plate } from "@/components/najdi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentForm } from "@/components/club-structure/department-form";
import { ClubLoading, DepartmentPlusIcon } from "@/components/club-structure/shared";
import { useClubError } from "@/components/club-structure/use-club-error";
import { useClubMutation, useClubOverview } from "@/hooks/use-club-structure";
import { useAccess } from "@/hooks/use-access";
import type { DepartmentSettings } from "@/lib/club-structure-types";

export default function CreateDepartmentPage() {
  // useSearchParams needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={<ClubLoading />}>
      <CreateDepartment />
    </Suspense>
  );
}

function CreateDepartment() {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const denied = useTranslations("accessDenied");
  const router = useRouter();
  const { can, isLoading } = useAccess();
  const describeError = useClubError();
  // The semester the department starts in: the one the overview had selected.
  const semesterId = useSearchParams().get("semester") ?? undefined;
  const overview = useClubOverview(semesterId);
  const semester = overview.data?.semester;
  const mutation = useClubMutation((api, settings: DepartmentSettings) =>
    api.createDepartment(settings, semester!.id),
  );

  async function create(settings: DepartmentSettings) {
    try {
      const department = await mutation.mutateAsync(settings);
      toast.success(t("departmentCreated"));
      router.push(`/club-structure?semester=${semester!.id}&department=${department.id}`);
      return true;
    } catch {
      // Keep the entered values so the user can correct or retry the request.
      return false;
    }
  }

  if (isLoading || (!semester && !overview.error)) return <ClubLoading />;
  if (!can("club_structure.manage"))
    return <AccessDenied title={denied("fallbackTitle")} description={denied("fallbackDescription")} />;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={semesterId ? `/club-structure?semester=${semesterId}` : "/club-structure"} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                {common("actions.back")}
              </Link>
            </Button>
          </div>
          <CardTitle className="flex items-center gap-3">
            <Plate tone="umber">
              <DepartmentPlusIcon className="size-[18px]" />
            </Plate>
            <h1 className="font-display text-[26px] leading-tight font-semibold">{t("newDepartment")}</h1>
          </CardTitle>
          <CardDescription className="mt-1">{t("createDescription", { semester: semester?.name ?? "" })}</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.error && (
            <p role="alert" className="text-door-madder-ink mb-6 text-sm">
              {describeError(overview.error)}
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-door-madder-ink mb-6 text-sm">
              {describeError(mutation.error, true)}
            </p>
          )}
          <DepartmentForm
            mode="create"
            pending={mutation.isPending}
            disabled={!semester}
            submitLabel={t("createDepartment")}
            onSubmit={create}
          />
        </CardContent>
      </Card>
    </div>
  );
}

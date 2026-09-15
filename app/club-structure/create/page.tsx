"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentForm } from "@/components/club-structure/department-form";
import { ClubLoading, DepartmentPlusIcon } from "@/components/club-structure/shared";
import { useClubError } from "@/components/club-structure/use-club-error";
import { useClubMutation } from "@/hooks/use-club-structure";
import { useUserRole } from "@/hooks/use-rbac";
import type { DepartmentSettings } from "@/lib/club-structure-types";

export default function CreateDepartmentPage() {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const denied = useTranslations("accessDenied");
  const router = useRouter();
  const { isLoaded } = useUser();
  const role = useUserRole();
  const describeError = useClubError();
  const mutation = useClubMutation((api, settings: DepartmentSettings) => api.createDepartment(settings));

  async function create(settings: DepartmentSettings) {
    try {
      const department = await mutation.mutateAsync(settings);
      toast.success(t("departmentCreated"));
      router.push(`/club-structure?department=${department.id}`);
      return true;
    } catch {
      // Keep the entered values so the user can correct or retry the request.
      return false;
    }
  }

  if (!isLoaded) return <ClubLoading />;
  if (role !== "super_admin")
    return <AccessDenied title={denied("fallbackTitle")} description={denied("fallbackDescription")} />;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/club-structure" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                {common("actions.back")}
              </Link>
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DepartmentPlusIcon className="h-5 w-5 text-primary" />
            </div>
            {t("newDepartment")}
          </CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.error && (
            <p role="alert" className="mb-6 text-sm text-destructive">
              {describeError(mutation.error, true)}
            </p>
          )}
          <DepartmentForm
            mode="create"
            pending={mutation.isPending}
            submitLabel={t("createDepartment")}
            onSubmit={create}
          />
        </CardContent>
      </Card>
    </div>
  );
}

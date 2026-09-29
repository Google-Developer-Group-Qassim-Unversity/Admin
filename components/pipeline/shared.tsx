"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineMe } from "@/hooks/use-pipeline";
import type { PipelineDepartment, PipelineMe } from "@/lib/pipeline-types";

/** A department's name in the reader's language. */
export function useDepartmentName() {
  const locale = useLocale();
  return React.useCallback(
    (department: Pick<PipelineDepartment, "name" | "ar_name"> | null | undefined) =>
      department ? (locale === "ar" ? department.ar_name : department.name) : "",
    [locale],
  );
}

/**
 * Renders its children only for someone who can use the pipeline, with the
 * caller's pipeline profile. The backend enforces every rule; this only saves
 * a person without access from a page of failed requests.
 */
export function PipelineGate({ children }: { children: (me: PipelineMe) => React.ReactNode }) {
  const t = useTranslations("pipeline");
  const { data: me, isPending, error } = usePipelineMe();

  if (isPending) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  if (error || !me?.has_access) {
    return (
      <Empty className="bg-card border-border rounded-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>{t("noAccess.title")}</EmptyTitle>
          <EmptyDescription>{error ? error.message : t("noAccess.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <>{children(me)}</>;
}

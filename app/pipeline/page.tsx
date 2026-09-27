"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { KeyRound, Workflow } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PipelineGate } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";

export default function PipelinePage() {
  const t = useTranslations("pipeline");

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Workflow}>
        <Button asChild variant="outline">
          <Link href="/pipeline/team">
            <KeyRound className="h-4 w-4" />
            {t("teamAccess")}
          </Link>
        </Button>
      </PageHeader>
      <PipelineGate>{() => null}</PipelineGate>
    </div>
  );
}

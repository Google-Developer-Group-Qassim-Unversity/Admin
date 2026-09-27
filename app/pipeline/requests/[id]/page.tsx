"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Workflow } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { RequestView } from "@/components/pipeline/request-view";
import { PipelineGate } from "@/components/pipeline/shared";

export default function PipelineRequestPage() {
  const t = useTranslations("pipeline");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
      <PageHeader title={t("requests.pageTitle", { id })} description={t("subtitle")} icon={Workflow} />
      <PipelineGate>{(me) => <RequestView id={id} me={me} />}</PipelineGate>
    </div>
  );
}

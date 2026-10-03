"use client";

import { useParams } from "next/navigation";

import { RequestView } from "@/components/pipeline/request-view";
import { PipelineGate } from "@/components/pipeline/shared";

export default function PipelineRequestPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <PipelineGate>{(me) => <RequestView id={id} me={me} />}</PipelineGate>
    </div>
  );
}

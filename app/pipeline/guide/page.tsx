"use client";

import { PipelineGuide } from "@/components/pipeline/guide";
import { PipelineGate } from "@/components/pipeline/shared";

export default function PipelineGuidePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <PipelineGate>{(me) => <PipelineGuide me={me} />}</PipelineGate>
    </div>
  );
}

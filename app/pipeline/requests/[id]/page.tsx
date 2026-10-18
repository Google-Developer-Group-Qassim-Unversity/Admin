"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { RequestView } from "@/components/pipeline/request-view";
import { PipelineGate } from "@/components/pipeline/shared";
import { Skeleton } from "@/components/ui/skeleton";

export default function PipelineRequestPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <PipelineGate>
        {(me) => (
          // The station showing lives in the URL (?step=), read with useSearchParams.
          <React.Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <RequestView id={id} me={me} />
          </React.Suspense>
        )}
      </PipelineGate>
    </div>
  );
}

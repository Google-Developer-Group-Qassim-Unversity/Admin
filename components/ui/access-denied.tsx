import { ShieldX } from "lucide-react";

import { Plate } from "@/components/najdi";

interface AccessDeniedProps {
  title?: string;
  description?: string;
}

/** A closed door: calm, on the wall, with the reason in plain words. */
export function AccessDenied({
  title = "Access Denied",
  description = "You don't have permission to access this feature.",
}: AccessDeniedProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 px-6 py-12 text-center text-balance">
      <Plate tone="neutral" icon={ShieldX} size="lg" />
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-display text-[22px] leading-tight font-semibold">{title}</h2>
        <p className="text-ink-2 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

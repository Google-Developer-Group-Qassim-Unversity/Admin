import type { LucideIcon } from "lucide-react";

import { BrandRail } from "@/components/brand-mark";

import { Skeleton } from "@/components/ui/skeleton";

export type Tone = "blue" | "green" | "yellow" | "red" | "neutral";

/** Full class strings - Tailwind scans source, so these cannot be built up. */
const TONES: Record<Tone, { soft: string; ink: string; ring: string; bar: string }> = {
  blue: { soft: "bg-brand-blue-soft", ink: "text-brand-blue-ink", ring: "", bar: "bg-brand-blue" },
  green: {
    soft: "bg-brand-green-soft",
    ink: "text-brand-green-ink",
    ring: "",
    bar: "bg-brand-green",
  },
  yellow: {
    soft: "bg-brand-yellow-soft",
    ink: "text-brand-yellow-ink",
    ring: "ring-1 ring-brand-yellow/40",
    bar: "bg-brand-yellow",
  },
  red: {
    soft: "bg-brand-red-soft",
    ink: "text-brand-red-ink",
    ring: "ring-1 ring-brand-red/40",
    bar: "bg-brand-red",
  },
  // The neutral tile gets the full four-colour rail instead of a single hue.
  neutral: { soft: "bg-muted", ink: "text-muted-foreground", ring: "", bar: "" },
};

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  hintTone,
  tone = "neutral",
  isPending,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Tints the hint line when it is itself the warning ("oldest waiting 6 days"). */
  hintTone?: Tone;
  tone?: Tone;
  isPending?: boolean;
}) {
  const t = TONES[tone];

  return (
    <div
      className={`bg-card border-border flex flex-col overflow-hidden rounded-xl border ${t.ring}`}
    >
      {tone === "neutral" ? (
        <BrandRail />
      ) : (
        <span className={`h-[3px] w-full shrink-0 ${t.bar}`} />
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${t.soft}`}>
          <Icon className={`h-3.5 w-3.5 ${t.ink}`} />
        </span>
        <span className="text-muted-foreground text-xs font-semibold">{label}</span>
      </div>

      {isPending ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="font-display tabular text-[28px] leading-none font-semibold">{value}</div>
      )}

      {hint ? (
        isPending ? (
          <Skeleton className="h-3.5 w-28" />
        ) : (
          <div
            className={`text-[11.5px] ${
              hintTone ? `font-semibold ${TONES[hintTone].ink}` : "text-muted-foreground"
            }`}
          >
            {hint}
          </div>
        )
      ) : null}
      </div>
    </div>
  );
}

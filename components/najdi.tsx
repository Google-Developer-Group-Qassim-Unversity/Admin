import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The Mud & Doors vocabulary (DESIGN.md). Limewash walls are the ground and
 * colour lives only on painted doors, so every piece here takes a `tone`, and
 * a tone is always a state:
 *
 *   green  done, live, published        ochre  waiting on someone (often you)
 *   madder returned, overdue, failed    indigo with a team, open, informational
 *   umber  draft, inactive
 */
export type DoorTone = "green" | "ochre" | "madder" | "indigo" | "umber";

/** A solid painted plate and the text that sits on it. */
export const PLATE: Record<DoorTone, string> = {
  green: "bg-door-green text-on-door",
  ochre: "bg-door-ochre text-on-door-ochre",
  madder: "bg-door-madder text-on-door",
  indigo: "bg-door-indigo text-on-door",
  umber: "bg-door-umber text-on-door",
};

/** A tinted ground with its readable ink: chips, pills, highlighted rows. */
export const SOFT: Record<DoorTone, string> = {
  green: "bg-door-green-soft text-door-green-ink",
  ochre: "bg-door-ochre-soft text-door-ochre-ink",
  madder: "bg-door-madder-soft text-door-madder-ink",
  indigo: "bg-door-indigo-soft text-door-indigo-ink",
  umber: "bg-door-umber-soft text-door-umber-ink",
};

/** Just the ink, for text sitting on the wall. */
export const INK: Record<DoorTone, string> = {
  green: "text-door-green-ink",
  ochre: "text-door-ochre-ink",
  madder: "text-door-madder-ink",
  indigo: "text-door-indigo-ink",
  umber: "text-door-umber-ink",
};

/** Just the solid colour, for marks and fills. */
export const FILL: Record<DoorTone, string> = {
  green: "bg-door-green",
  ochre: "bg-door-ochre",
  madder: "bg-door-madder",
  indigo: "bg-door-indigo",
  umber: "bg-door-umber",
};

const PLATE_SIZE = {
  sm: "h-9 w-8 [&_svg]:size-4",
  md: "h-11 w-10 [&_svg]:size-[18px]",
  lg: "h-[52px] w-14 [&_svg]:size-6",
} as const;

/** An icon on a small painted door. Decorative: the row it sits in carries the words. */
export function Plate({
  tone,
  icon: Icon,
  size = "md",
  className,
  children,
}: {
  tone: DoorTone;
  icon?: LucideIcon;
  size?: keyof typeof PLATE_SIZE;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "plate-depth grid shrink-0 place-items-center rounded-t-[4px] rounded-b-[2px]",
        PLATE[tone],
        PLATE_SIZE[size],
        className,
      )}
    >
      {Icon ? <Icon strokeWidth={1.75} /> : children}
    </span>
  );
}

/** A small square state mark: the house's replacement for a round status dot. */
export function Mark({ tone, className }: { tone: DoorTone; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0 rounded-[1px]", FILL[tone], className)} />;
}

/** The carved triangle-and-diamond band across a door. */
export function DoorBand({ tone = "ochre", className }: { tone?: DoorTone; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("door-band h-2.5 shrink-0", tone === "ochre" ? "bg-[var(--door-carve)]" : "bg-white/22", className)}
    />
  );
}

/**
 * A painted door: the one big coloured surface a screen may have, for the one
 * thing that is waiting on the reader (your turn, a task, a hold). Carved bands
 * run across the top and bottom.
 */
export function Door({
  tone = "ochre",
  className,
  innerClassName,
  children,
  ...props
}: React.ComponentProps<"section"> & { tone?: DoorTone; innerClassName?: string }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl shadow-[0_1px_0_rgb(0_0_0/0.06),0_10px_24px_-14px_rgb(58_42_31/0.55)]",
        PLATE[tone],
        className,
      )}
      {...props}
    >
      <DoorBand tone={tone} className="mt-2" />
      <div className={cn("flex flex-col gap-3 px-4 pt-3 pb-4", innerClassName)}>{children}</div>
      <DoorBand tone={tone} className="mb-2 -scale-y-100" />
    </section>
  );
}

/** The light panel set into a door, where the details sit. */
export function DoorPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-sm bg-[var(--door-panel)] px-3.5 py-3 text-[var(--door-panel-ink)] shadow-[inset_0_0_0_1px_var(--door-panel-rule)]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Five triangular tarma openings, the window shape of a Najdi wall: how far a
 * request has come. Filled green is done, the outlined one in colour is where
 * it is now, madder is a step that was sent back.
 */
export function Tarma({
  current,
  total = 5,
  tone = "ochre",
  returned = false,
  done = false,
  size = 12,
  label,
  onDoor = false,
  className,
}: {
  /** Zero-based index of the step the thing is on. */
  current: number;
  total?: number;
  /** The colour of the current step: whose turn it is. */
  tone?: DoorTone;
  /** The current step was sent back. */
  returned?: boolean;
  /** Every step is done. */
  done?: boolean;
  size?: number;
  /** Words for screen readers, e.g. "Step 2 of 5: With Design & Logistics". */
  label?: string;
  /** Drawn on a painted door: future steps take the door's ink. */
  onDoor?: boolean;
  className?: string;
}) {
  const gap = Math.round(size * 0.42);
  const h = Math.round(size * 0.9);
  const w = size * total + gap * (total - 1);
  return (
    <svg
      viewBox={`-1 -1 ${w + 2} ${h + 2}`}
      width={w + 2}
      height={h + 2}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 overflow-visible", className)}
    >
      {Array.from({ length: total }, (_, i) => {
        const x = i * (size + gap);
        const points = `${x},${h} ${x + size},${h} ${x + size / 2},0.5`;
        const state = done || i < current ? "done" : i === current ? (returned ? "returned" : "current") : "future";
        return (
          <polygon
            key={i}
            points={points}
            strokeLinejoin="round"
            strokeWidth={state === "current" ? 2 : 1.4}
            className={cn(
              state === "done" && "fill-door-green stroke-door-green",
              state === "returned" && "fill-door-madder stroke-door-madder",
              state === "current" &&
                (onDoor
                  ? "fill-current/30 stroke-current"
                  : cn("fill-none", TARMA_STROKE[tone])),
              state === "future" && (onDoor ? "fill-none stroke-current opacity-45" : "stroke-adobe fill-none opacity-75"),
            )}
          />
        );
      })}
    </svg>
  );
}

const TARMA_STROKE: Record<DoorTone, string> = {
  green: "stroke-door-green-ink",
  ochre: "stroke-door-ochre-ink",
  madder: "stroke-door-madder-ink",
  indigo: "stroke-door-indigo-ink",
  umber: "stroke-door-umber-ink",
};

/** Bricks laid in a course: how much of something is filled in. */
export function Courses({ done, total, className, label }: { done: number; total: number; className?: string; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("flex gap-0.5", className)}
    >
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={cn(
            "h-2 flex-1 rounded-[1px]",
            i < done ? "bg-door-green" : "bg-sunk shadow-[inset_0_0_0_1px_var(--rule)]",
          )}
        />
      ))}
    </span>
  );
}

/** A square counter: ink by default, ochre when it is waiting on the reader. */
export function Count({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: "ochre" | "madder";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular inline-grid h-[22px] min-w-[22px] place-items-center rounded-sm px-1.5 text-[12.5px] font-bold",
        tone ? PLATE[tone] : "bg-foreground text-background",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A section heading: rank by weight, not size, with a one-pixel ink rule under
 * it. `action` sits on the trailing side (a link, a button, a filter).
 */
export function SectionHead({
  title,
  count,
  countTone,
  action,
  as: Tag = "h2",
  id,
  className,
}: {
  title: React.ReactNode;
  count?: React.ReactNode;
  countTone?: "ochre" | "madder";
  action?: React.ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-foreground flex min-h-10 items-end justify-between gap-3 border-b pb-2", className)}>
      <Tag id={id} className="inline-flex items-center gap-2 text-base leading-snug font-bold">
        {title}
        {count != null ? <Count tone={countTone}>{count}</Count> : null}
      </Tag>
      {action ? <div className="flex shrink-0 items-center gap-2 text-[13.5px] font-bold">{action}</div> : null}
    </div>
  );
}

/** The stepped shurfa parapet along the top of a header. Give it the header's background. */
export function Shurfa({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("shurfa bg-card h-3.5 shrink-0", className)} />;
}

/** Bricks in mortar: a grid whose gaps read as mortar joints. Children are the bricks. */
export function Mortar({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("bg-mortar grid gap-1 rounded-lg p-1", className)} {...props} />;
}

/** One labelled fact: muted term, value. Use inside a `<dl className="grid grid-cols-[max-content_1fr]">`. */
export function Fact({ term, children, className }: { term: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <>
      <dt className={cn("text-ink-2 border-rule border-b py-2 pe-4 text-sm", className)}>{term}</dt>
      <dd className={cn("border-rule border-b py-2 text-sm font-medium", className)}>{children}</dd>
    </>
  );
}

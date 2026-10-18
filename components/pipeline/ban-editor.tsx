"use client";

import * as React from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Ban, CalendarCheck, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { BookingCalendar, type ClosedBlock } from "@/components/pipeline/booking-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBanDays, useBlockMutation } from "@/hooks/use-pipeline";
import type { CalendarDay } from "@/lib/pipeline-types";

/**
 * Logistics picks days on the calendar and closes them together as one block,
 * with the reason every team sees (one day or a whole break), or reopens them.
 * Under the calendar each block can have its reason changed or be reopened whole.
 */
export function BanEditor({ onDone }: { onDone: () => void }) {
  const t = useTranslations("pipeline.bans");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [reason, setReason] = React.useState("");
  const mutation = useBanDays();
  // Past days cannot be banned; the server checks this in Riyadh time.
  const today = format(new Date(), "yyyy-MM-dd");

  const toggle = (day: CalendarDay) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(day.date)) next.delete(day.date);
      else next.add(day.date);
      return next;
    });

  const run = async (unban: boolean) => {
    try {
      const result = await mutation.mutateAsync({ dates: [...selected].sort(), reason: reason.trim(), unban });
      toast.success(unban ? t("unbanned", { count: result.count }) : t("banned", { count: result.count }));
      setSelected(new Set());
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <div className="flex flex-col gap-5 max-md:pb-48">
      <p className="text-ink-2 text-sm text-pretty">{t("hint")}</p>
      <BookingCalendar
        selected={selected}
        onDayClick={toggle}
        isSelectable={(d) => d.date >= today}
        blockActions={(block) => <BlockActions block={block} today={today} />}
        toolbar={
          <Button variant="ghost" size="sm" onClick={onDone}>
            <X />
            {t("done")}
          </Button>
        }
      />
      <div className="bg-card border-foreground flex flex-col gap-3 border-t px-4 py-3 max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))] max-md:z-30 md:flex-row md:items-center md:rounded-xl md:border-0 md:ring-1 md:ring-rule">
        <b className={selected.size ? "shrink-0 text-[15px] font-bold" : "text-ink-2 shrink-0 text-sm font-medium"}>
          {t("selected", { count: selected.size })}
        </b>
        <Input
          value={reason}
          maxLength={200}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reasonPlaceholder")}
          aria-label={t("reasonPlaceholder")}
          disabled={selected.size === 0}
          enterKeyHint="done"
          className="md:max-w-xs"
        />
        <div className="flex gap-2 *:flex-1 md:ms-auto md:*:flex-none">
          <Button
            variant="madder"
            onClick={() => run(false)}
            disabled={selected.size === 0 || !reason.trim() || mutation.isPending}
            title={selected.size && !reason.trim() ? t("reasonRequired") : undefined}
          >
            <Ban />
            {t("ban")}
          </Button>
          <Button variant="outline" onClick={() => run(true)} disabled={selected.size === 0 || mutation.isPending}>
            <CalendarCheck />
            {t("unban")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Change a block's reason in place, or reopen all of its days that are not past. */
function BlockActions({ block, today }: { block: ClosedBlock; today: string }) {
  const t = useTranslations("pipeline.bans");
  const mutation = useBlockMutation();
  const [editing, setEditing] = React.useState(false);
  const [reason, setReason] = React.useState(block.reason ?? "");
  const allPast = block.days.every((d) => d < today);

  const save = async () => {
    try {
      await mutation.mutateAsync({ blockId: block.id, reason: reason.trim() });
      toast.success(t("reasonSaved"));
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const reopen = async () => {
    try {
      const result = await mutation.mutateAsync({ blockId: block.id });
      toast.success(t("unbanned", { count: result.count }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Input
          value={reason}
          maxLength={200}
          onChange={(e) => setReason(e.target.value)}
          aria-label={t("editReason")}
          className="h-8 w-48"
          autoFocus
        />
        <Button type="submit" variant="ghost" size="icon" aria-label={t("saveReason")} disabled={!reason.trim() || mutation.isPending}>
          <Check />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={t("done")} onClick={() => setEditing(false)}>
          <X />
        </Button>
      </form>
    );
  }
  return (
    <>
      <Button variant="ghost" size="icon" aria-label={t("editReason")} title={t("editReason")} onClick={() => setEditing(true)}>
        <Pencil />
      </Button>
      {!allPast ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("reopenBlock")}
          title={t("reopenBlock")}
          onClick={reopen}
          disabled={mutation.isPending}
        >
          <CalendarCheck />
        </Button>
      ) : null}
    </>
  );
}

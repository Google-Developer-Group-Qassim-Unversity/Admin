"use client";

import * as React from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Ban, CalendarCheck, X } from "lucide-react";
import { toast } from "sonner";

import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBanDays } from "@/hooks/use-pipeline";
import type { CalendarDay } from "@/lib/pipeline-types";

/** Logistics picks days on the calendar and bans or unbans them together. */
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
      const result = await mutation.mutateAsync({ dates: [...selected].sort(), reason: reason.trim() || null, unban });
      toast.success(unban ? t("unbanned", { count: result.count }) : t("banned", { count: result.count }));
      setSelected(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const done = (
    <Button variant="ghost" size="sm" onClick={onDone}>
      <X className="h-4 w-4" />
      {t("done")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <BookingCalendar
        selected={selected}
        onDayClick={toggle}
        isSelectable={(d) => d.date >= today}
        toolbar={done}
      />
      <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-3 shadow-sm sm:flex-row sm:items-center max-sm:sticky max-sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] max-sm:shadow-lg">
        {selected.size === 0 ? (
          <span className="text-muted-foreground min-w-0 flex-1 text-sm">{t("hint")}</span>
        ) : (
          <>
            <span className="shrink-0 text-sm font-semibold">{t("selected", { count: selected.size })}</span>
            <Input
              value={reason}
              maxLength={200}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="sm:max-w-xs"
            />
            <div className="flex gap-2 *:flex-1 sm:ms-auto sm:*:flex-none">
              <Button onClick={() => run(false)} disabled={mutation.isPending}>
                <Ban className="h-4 w-4" />
                {t("ban")}
              </Button>
              <Button variant="outline" onClick={() => run(true)} disabled={mutation.isPending}>
                <CalendarCheck className="h-4 w-4" />
                {t("unban")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Time left until `until`, ticking every second. `serverNow` is the server's
 * clock at the time of the response, so a wrong laptop clock does not move
 * a deadline.
 */
export function useTimeLeft(until: string | null, serverNow: string) {
  // The server's time, advanced by how long ago the response arrived.
  const [now, setNow] = React.useState(() => new Date(serverNow).getTime());
  React.useEffect(() => {
    const received = performance.now();
    const base = new Date(serverNow).getTime();
    const tick = () => setNow(base + (performance.now() - received));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverNow]);
  return until ? new Date(until).getTime() - now : null;
}

/**
 * A hold, a fix window or a return deadline running down.
 *
 * `words` reads "14h 32m left" (seconds only in the last hour); `clock` is the
 * big 14:32:05 a door carries. `plain` keeps the surrounding colour, for text
 * sitting on a painted door where the madder warning ink would not read.
 */
export function Countdown({
  until,
  serverNow,
  format = "words",
  plain = false,
  className,
}: {
  until: string | null;
  serverNow: string;
  format?: "words" | "clock";
  plain?: boolean;
  className?: string;
}) {
  const t = useTranslations("pipeline.countdown");
  const left = useTimeLeft(until, serverNow);
  if (left === null) return null;
  if (left <= 0) {
    return <span className={cn("font-bold", !plain && "text-door-madder-ink", className)}>{t("expired")}</span>;
  }
  const totalSeconds = Math.floor(left / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = hours === 0;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (format === "clock") {
    return (
      <span dir="ltr" className={cn("tabular font-bold tracking-[0.02em]", !plain && urgent && "text-door-madder-ink", className)}>
        {`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </span>
    );
  }
  return (
    <span className={cn("tabular font-bold", !plain && urgent && "text-door-madder-ink", className)}>
      {urgent
        ? t("leftMinutes", { minutes, seconds: pad(seconds) })
        : t("left", { hours, minutes: pad(minutes) })}
    </span>
  );
}

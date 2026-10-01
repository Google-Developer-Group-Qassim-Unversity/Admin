"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

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

export function Countdown({ until, serverNow }: { until: string | null; serverNow: string }) {
  const t = useTranslations("pipeline.countdown");
  const left = useTimeLeft(until, serverNow);
  if (left === null) return null;
  if (left <= 0) return <span className="text-brand-red-ink font-semibold">{t("expired")}</span>;
  const totalMinutes = Math.floor(left / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((left % 60000) / 1000);
  // Seconds only matter in the last hour; before that they just make it look urgent.
  const urgent = hours === 0;
  return (
    <span className={`tabular font-semibold ${urgent ? "text-brand-red-ink" : ""}`}>
      {urgent
        ? t("leftMinutes", { minutes, seconds: String(seconds).padStart(2, "0") })
        : t("left", { hours, minutes: String(minutes).padStart(2, "0") })}
    </span>
  );
}

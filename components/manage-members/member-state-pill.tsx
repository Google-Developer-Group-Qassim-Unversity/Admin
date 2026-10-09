"use client";

import { useTranslations } from "next-intl";

/**
 * Whether a member signed in themselves (green: active) or only exists because
 * an admin typed them in (neutral: inactive). Colour follows the console's
 * colour = state rule, so it comes from the door tokens, never raw palette.
 */
export function MemberStatePill({ authenticated, className }: { authenticated: boolean; className?: string }) {
  const t = useTranslations("manageMembersPage");
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-[12px] leading-none font-bold ${
        authenticated ? "bg-door-green-soft text-door-green-ink" : "bg-door-umber-soft text-door-umber-ink"
      } ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-2 shrink-0 rounded-[1px] ${authenticated ? "bg-door-green" : "bg-door-umber"}`}
      />
      {authenticated ? t("authenticated") : t("manual")}
    </span>
  );
}

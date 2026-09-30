"use client";

import { useTranslations } from "next-intl";

/**
 * Whether a member signed in themselves (green: active) or only exists because
 * an admin typed them in (neutral: inactive). Colour follows the console's
 * colour = state rule, so it comes from the brand tokens, never raw palette.
 */
export function MemberStatePill({ authenticated, className }: { authenticated: boolean; className?: string }) {
  const t = useTranslations("manageMembersPage");
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
        authenticated ? "bg-brand-green-soft text-brand-green-ink" : "bg-muted text-muted-foreground"
      } ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${
          authenticated ? "bg-brand-green" : "bg-muted-foreground/60"
        }`}
      />
      {authenticated ? t("authenticated") : t("manual")}
    </span>
  );
}

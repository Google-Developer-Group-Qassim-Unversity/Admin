"use client";

import { useTranslations } from "next-intl";
import { ApiRequestError } from "@/lib/api/errors";

/** Status-based copy works in either language without matching backend prose. */
export function useClubError() {
  const t = useTranslations("clubStructure.errors");
  return (error: Error | null, mutation = false): string | undefined => {
    if (!error) return undefined;
    if (error instanceof ApiRequestError) {
      if (error.status === 401) return t("unauthenticated");
      if (error.status === 403) return t("forbidden");
      if (error.status === 404) return t("notFound");
      if (error.status === 409) return t("conflict");
      if (error.status === 422) return t("validation");
      if (error.status === 429) return t("rateLimit");
      if (error.status === 0 && !mutation) return t("offline");
    }
    return t(mutation ? "unconfirmedChange" : "unavailable");
  };
}

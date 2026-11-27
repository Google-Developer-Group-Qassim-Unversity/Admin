"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomEventsList } from "@/components/custom-events-list";
import { PointsEmpty, PointsListSkeleton, PointsLoadError } from "@/components/points-list-states";
import { useApi } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import type { BonusSummary } from "@/lib/api-types";
import { useTranslations } from "next-intl";

/** Standalone bonuses. The page header and tabs come from the points layout. */
export default function PointsPage() {
  const t = useTranslations("pointsList");
  const te = useTranslations("editCustomEvent");
  const api = useApi();
  const [bonuses, setBonuses] = useState<BonusSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isServerError?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBonuses() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.bonuses.list({ standaloneOnly: true });
        if (!cancelled) setBonuses(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiRequestError
              ? { message: err.message, isServerError: err.isServerError }
              : { message: err instanceof Error ? err.message : te("loadFailed") }
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBonuses();
    return () => {
      cancelled = true;
    };
  }, [api, te]);

  if (isLoading) return <PointsListSkeleton />;
  if (error) return <PointsLoadError message={error.message} isServerError={error.isServerError} />;
  if (bonuses.length === 0) {
    return (
      <PointsEmpty icon={Trophy} title={t("noneYetTitle")} description={t("noneYetDescription")}>
        <Button asChild>
          <Link href="/points/create">
            <Plus />
            {t("createFirst")}
          </Link>
        </Button>
      </PointsEmpty>
    );
  }
  return <CustomEventsList bonuses={bonuses} />;
}

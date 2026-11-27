"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomEventsList } from "@/components/custom-events-list";
import { PointsEmpty, PointsListSkeleton, PointsLoadError } from "@/components/points-list-states";
import { getBonuses } from "@/lib/api";
import type { BonusSummary } from "@/lib/api-types";
import { useTranslations } from "next-intl";

/** Standalone bonuses. The page header and tabs come from the points layout. */
export default function PointsPage() {
  const t = useTranslations("pointsList");
  const { getToken } = useAuth();
  const [bonuses, setBonuses] = useState<BonusSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isServerError?: boolean } | null>(null);

  useEffect(() => {
    async function fetchBonuses() {
      setIsLoading(true);
      setError(null);
      const response = await getBonuses({ standaloneOnly: true }, getToken);
      if (response.success) {
        setBonuses(response.data);
      } else {
        setError(response.error);
      }
      setIsLoading(false);
    }
    fetchBonuses();
  }, [getToken]);

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

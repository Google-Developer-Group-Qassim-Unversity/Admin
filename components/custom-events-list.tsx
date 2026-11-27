"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { PointsCustomEventCard } from "@/components/points-custom-event-card";
import { POINTS_LIST } from "@/components/points-list-states";
import type { BonusSummary } from "@/lib/api-types";
import { useFuzzySearch } from "@/lib/search-utils";
import { parseLocalDateTime } from "@/lib/utils";

const SHOWN = 50;

export function CustomEventsList({ bonuses }: { bonuses: BonusSummary[] }) {
  const tp = useTranslations("points");
  const [searchQuery, setSearchQuery] = React.useState("");

  const searchResults = useFuzzySearch(bonuses, searchQuery, ["title"]);

  const filteredBonuses = React.useMemo(() => {
    const source = searchQuery.trim() ? searchResults : bonuses;
    return [...source]
      .sort((a, b) => parseLocalDateTime(b.given_at).getTime() - parseLocalDateTime(a.given_at).getTime())
      .slice(0, SHOWN);
  }, [searchResults, searchQuery, bonuses]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={tp("searchCustom")}
        trailing={
          <>
            <span className="tabular">{tp("shownCount", { shown: filteredBonuses.length, total: bonuses.length })}</span>
            {searchQuery ? (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="shrink-0">
                <X />
                {tp("clearFilters")}
              </Button>
            ) : null}
          </>
        }
      />

      {filteredBonuses.length > 0 ? (
        <ul className={POINTS_LIST}>
          {filteredBonuses.map((bonus) => (
            <PointsCustomEventCard key={bonus.id} bonus={bonus} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-2 py-12 text-center text-sm">{tp("noMatchCustom")}</p>
      )}
    </div>
  );
}

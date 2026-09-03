"use client";

import { Button } from "@/components/ui/button";
import { CheckCheck, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SelectedRowsActionsProps {
  selectedCount: number;
  allAccepted: boolean;
  onAcceptSelected: () => void;
  isLoading?: boolean;
}

export function SelectedRowsActions({
  selectedCount,
  allAccepted,
  onAcceptSelected,
  isLoading = false,
}: SelectedRowsActionsProps) {
  const t = useTranslations("responses");
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t("selectedCount", { count: selectedCount })}
      </span>
      <Button
        variant={allAccepted ? "destructive" : "default"}
        size="sm"
        onClick={onAcceptSelected}
        className="gap-1"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("processing")}
          </>
        ) : allAccepted ? (
          <>
            <X className="h-4 w-4" />
            {t("removeAcceptance")}
          </>
        ) : (
          <>
            <CheckCheck className="h-4 w-4" />
            {t("acceptSelected")}
          </>
        )}
      </Button>
    </div>
  );
}

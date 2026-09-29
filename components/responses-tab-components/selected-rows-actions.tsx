"use client";

import { Button } from "@/components/ui/button";
import { CheckCheck, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface SelectedRowsActionsProps {
  selectedCount: number;
  allAccepted: boolean;
  onAcceptSelected: () => void;
  isLoading?: boolean;
  /**
   * `inline` sits in the desktop toolbar. `floating` is the phone bulk bar:
   * pinned just above the bottom tab bar, so the action stays in thumb reach
   * while the admin scrolls and ticks rows.
   */
  variant?: "inline" | "floating";
  onClearSelection?: () => void;
  className?: string;
}

export function SelectedRowsActions({
  selectedCount,
  allAccepted,
  onAcceptSelected,
  isLoading = false,
  variant = "inline",
  onClearSelection,
  className,
}: SelectedRowsActionsProps) {
  const t = useTranslations("responses");
  if (selectedCount === 0) {
    return null;
  }

  const floating = variant === "floating";

  return (
    <div
      role={floating ? "region" : undefined}
      aria-label={floating ? t("selectedCount", { count: selectedCount }) : undefined}
      className={cn(
        "flex items-center gap-2",
        floating &&
          "fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 rounded-2xl border bg-card p-2 ps-3 shadow-lg",
        className
      )}
    >
      {floating && onClearSelection ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          aria-label={t("clearSelection")}
          className="-ms-1 shrink-0 pointer-coarse:size-10"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      <span className={cn("tabular text-sm text-muted-foreground", floating && "flex-1 font-medium text-foreground")}>
        {t("selectedCount", { count: selectedCount })}
      </span>
      <Button
        variant={allAccepted ? "destructive" : "default"}
        size={floating ? "default" : "sm"}
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

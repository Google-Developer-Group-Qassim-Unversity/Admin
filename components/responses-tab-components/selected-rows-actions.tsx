"use client";

import { Button } from "@/components/ui/button";
import { CheckCheck, X, Loader2 } from "lucide-react";

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
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {selectedCount} selected
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
            Processing...
          </>
        ) : allAccepted ? (
          <>
            <X className="h-4 w-4" />
            Remove Acceptance
          </>
        ) : (
          <>
            <CheckCheck className="h-4 w-4" />
            Accept Selected
          </>
        )}
      </Button>
    </div>
  );
}

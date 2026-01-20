"use client";

import { Button } from "@/components/ui/button";
import { CheckCheck, X } from "lucide-react";

interface SelectedRowsActionsProps {
  selectedCount: number;
  allAccepted: boolean;
  onAcceptSelected: () => void;
}

export function SelectedRowsActions({
  selectedCount,
  allAccepted,
  onAcceptSelected,
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
      >
        {allAccepted ? (
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

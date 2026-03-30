"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SendAcceptanceButtonProps {
  onClick: () => void;
  recipientCount: number;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SendAcceptanceButton({
  onClick,
  recipientCount,
  isLoading = false,
  disabled = false,
}: SendAcceptanceButtonProps) {
  return (
    <Button
      variant="default"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <Mail className="mr-2 h-4 w-4" />
      Send Acceptance{recipientCount > 0 ? ` (${recipientCount})` : ""}
    </Button>
  );
}
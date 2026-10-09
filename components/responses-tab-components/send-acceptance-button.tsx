"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface SendAcceptanceButtonProps {
  onClick: () => void;
  recipientCount: number;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SendAcceptanceButton({
  onClick,
  recipientCount,
  isLoading = false,
  disabled = false,
  className,
}: SendAcceptanceButtonProps) {
  const t = useTranslations("responses");
  return (
    <Button
      // Accepted members still waiting for their email are waiting on you.
      variant={recipientCount > 0 ? "ochre" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
    >
      <Mail />
      {t("sendAcceptance", { count: recipientCount })}
    </Button>
  );
}
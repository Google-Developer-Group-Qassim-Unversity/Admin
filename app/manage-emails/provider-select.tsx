"use client";

import { Cloud, Mail } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailProvider } from "@/lib/api-types";
import { useTranslations } from "next-intl";

export function ProviderSelect({
  value,
  onChange,
  disabled,
}: {
  value: EmailProvider;
  onChange: (value: EmailProvider) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("manageEmails.provider");

  return (
    <div className="space-y-2">
      <Label>{t("label")}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as EmailProvider)} disabled={disabled}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="google">
            <span className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> {t("google")}
            </span>
          </SelectItem>
          <SelectItem value="ses">
            <span className="flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5" /> {t("ses")}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

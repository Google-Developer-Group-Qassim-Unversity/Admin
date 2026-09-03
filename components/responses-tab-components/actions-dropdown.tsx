"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, CheckCheck, Users, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

interface ActionsDropdownProps {
  onCopyAsTSV: () => void;
  onAcceptAll: () => void;
  onAcceptBulk: () => void;
  onCopyAcceptedEmails: () => void;
  filteredRowCount: number;
  isLoading?: boolean;
}

export function ActionsDropdown({
  onCopyAsTSV,
  onAcceptAll,
  onAcceptBulk,
  onCopyAcceptedEmails,
  filteredRowCount,
  isLoading = false,
}: ActionsDropdownProps) {
  const t = useTranslations("responses");
  const tf = useTranslations("common.fields");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {tf("actions")}
          <ChevronDown className="ms-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem onClick={onCopyAsTSV}>
          <Copy className="me-2 h-4 w-4" />
          {t("copyAsTsv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyAcceptedEmails}>
          <Mail className="me-2 h-4 w-4" />
          {t("copyAcceptedEmails")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAcceptAll} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("processing")}
            </>
          ) : (
            <>
              <CheckCheck className="me-2 h-4 w-4" />
              {t("acceptAllCount", { count: filteredRowCount })}
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAcceptBulk} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("processing")}
            </>
          ) : (
            <>
              <Users className="me-2 h-4 w-4" />
              {t("acceptBulk")}
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

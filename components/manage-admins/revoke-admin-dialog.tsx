"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { MemberWithRole } from "@/lib/api-types";
import { useTranslations } from "next-intl";

interface RevokeAdminDialogProps {
  admin: MemberWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function RevokeAdminDialog({
  admin,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: RevokeAdminDialogProps) {
  const t = useTranslations("revokeAdmin");
  const tc = useTranslations("common.actions");
  const tr = useTranslations("common.roles");
  if (!admin) return null;

  const roleLabel = admin.role === "super_admin" ? tr("superAdmin") : tr("admin");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>{t("title", { role: roleLabel })}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t.rich("confirmDescription", {
                role: roleLabel,
                strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                name: admin.name,
              })}
            </p>
            <p>
              {t("loseAccessIntro")}
            </p>
            <ul className="list-disc list-inside ms-2 space-y-1">
              <li>{t("loseAccessDashboard")}</li>
              <li>{t("loseAccessEvents")}</li>
              {admin.role === "super_admin" && (
                <li>{t("loseAccessAdmins")}</li>
              )}
            </ul>
            <p className="font-medium mt-4">{t("reversible")}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? t("revoking") : t("revokeAccess")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

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

interface RemoveGoogleFormDialogProps {
  sharedWithEmail: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function RemoveGoogleFormDialog({
  sharedWithEmail,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: RemoveGoogleFormDialogProps) {
  const t = useTranslations("removeGoogleForm");
  const tc = useTranslations("common.actions");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>{t("confirmDescription", { email: sharedWithEmail ?? "" })}</p>
            <p>{t("consequenceIntro")}</p>
            <ul className="list-disc list-inside ms-2 space-y-1">
              <li>{t("consequenceNewForm")}</li>
              <li>{t("consequenceOldForm")}</li>
            </ul>
            <p className="font-medium mt-4">{t("reversibleHint")}</p>
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
            {isLoading ? t("removing") : t("remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

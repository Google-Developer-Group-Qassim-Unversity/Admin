"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface AcceptAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  submissionCount: number;
  isLoading?: boolean;
}

export function AcceptAllDialog({
  open,
  onOpenChange,
  onSubmit,
  submissionCount,
  isLoading = false,
}: AcceptAllDialogProps) {
  const t = useTranslations("responses");
  const tc = useTranslations("common.actions");
  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing while request is in progress
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("acceptAllTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("acceptAllDescription", { count: submissionCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {tc("cancel")}
          </AlertDialogCancel>
          <Button
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("acceptAll")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

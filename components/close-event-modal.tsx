'use client';

import { useTranslations } from "next-intl";
import { DoorClosed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCloseEvent } from '@/hooks/use-event';
import type { Event } from '@/lib/api-types';

interface CloseEventModalProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  getToken: () => Promise<string | null>;
}

export function CloseEventModal({
  event,
  open,
  onOpenChange,
  onSuccess,
  getToken,
}: CloseEventModalProps) {
  const closeEvent = useCloseEvent(getToken);

  const t = useTranslations("closeEvent");
  const tc = useTranslations("common.actions");
  const ts = useTranslations("common.states");

  const handleClose = async () => {
    try {
      await closeEvent.mutateAsync(event.id);
      toast.success(t("success"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("failed"), {
        description: error instanceof Error ? error.message : t("unknownError"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closeEvent.isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleClose}
            disabled={closeEvent.isPending}
          >
            {closeEvent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {ts("closing")}
              </>
            ) : (
              <>
                <DoorClosed className="h-4 w-4" />
                {t("closeButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

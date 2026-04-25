'use client';

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

  const handleClose = async () => {
    try {
      await closeEvent.mutateAsync(event.id);
      toast.success('Event closed successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to close event', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Event</DialogTitle>
          <DialogDescription>
            Are you sure you want to close this event? You can re-open it later.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closeEvent.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClose}
            disabled={closeEvent.isPending}
          >
            {closeEvent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Closing...
              </>
            ) : (
              <>
                <DoorClosed className="h-4 w-4" />
                Close Event
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

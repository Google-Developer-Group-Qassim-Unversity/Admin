'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { DoorClosed, Mail, Loader2 } from 'lucide-react';
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
import { useCloseEvent, useSendCertificates } from '@/hooks/use-event';
import type { Event } from '@/lib/api-types';

interface CloseEventModalProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CloseEventModal({
  event,
  open,
  onOpenChange,
  onSuccess,
}: CloseEventModalProps) {
  const { getToken } = useAuth();
  const closeEvent = useCloseEvent(getToken);
  const sendCertificates = useSendCertificates(getToken);
  const [isClosingWithCertificates, setIsClosingWithCertificates] = useState(false);

  const handleCloseOnly = async () => {
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

  const handleCloseAndSendCertificates = async () => {
    setIsClosingWithCertificates(true);
    
    try {
      // First, close the event
      await closeEvent.mutateAsync(event.id);
      
      // Then, send certificates
      try {
        await sendCertificates.mutateAsync(event.id);
        toast.success('Event closed and certificates sent successfully');
      } catch (certError) {
        // Event is closed but certificates failed
        toast.warning('Event closed, but failed to send certificates', {
          description: certError instanceof Error ? certError.message : 'Unknown error',
        });
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to close event', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsClosingWithCertificates(false);
    }
  };

  const isLoading = closeEvent.isPending || isClosingWithCertificates;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Event</DialogTitle>
          <DialogDescription>
            Are you sure you want to close this event? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleCloseOnly}
            disabled={isLoading}
          >
            {closeEvent.isPending && !isClosingWithCertificates ? (
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
          <Button
            onClick={handleCloseAndSendCertificates}
            disabled={isLoading}
          >
            {isClosingWithCertificates ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Close & Send Certificates
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

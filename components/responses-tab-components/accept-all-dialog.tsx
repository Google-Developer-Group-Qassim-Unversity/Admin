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
          <AlertDialogTitle>Accept All Submissions?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to accept all {submissionCount} filtered submission{submissionCount !== 1 ? "s" : ""}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Accept All"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

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

import type { ConfirmDialogState } from "./types";

interface ConfirmDialogProps {
  dialog: ConfirmDialogState | null;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
}

export function ConfirmDialog({ dialog, onOpenChange, isSubmitting }: ConfirmDialogProps) {
  if (!dialog) return null;

  return (
    <AlertDialog open={dialog.open} onOpenChange={(open) => !open && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.items.length > 0 && (
          <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 text-sm space-y-1">
            {dialog.items.slice(0, 10).map((item, i) => (
              <div key={i} className="text-muted-foreground flex items-center gap-2">
                <span className="text-xs">•</span>
                <span>{item}</span>
              </div>
            ))}
            {dialog.items.length > 10 && (
              <div className="text-muted-foreground italic text-xs">
                ...and {dialog.items.length - 10} more
              </div>
            )}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={dialog.onConfirm}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

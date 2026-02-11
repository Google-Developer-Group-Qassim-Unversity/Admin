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
  if (!admin) return null;

  const roleLabel = admin.role === "super_admin" ? "Super Admin" : "Admin";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Revoke {roleLabel} Access</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to revoke {roleLabel.toLowerCase()} access for{" "}
              <span className="font-semibold">{admin.name}</span>?
            </p>
            <p>
              They will no longer be able to:
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Access the admin dashboard</li>
              <li>Manage events and participants</li>
              {admin.role === "super_admin" && (
                <li>Manage other administrators</li>
              )}
            </ul>
            <p className="font-medium mt-4">This action can be reversed by promoting them again.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? "Revoking..." : "Revoke Access"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

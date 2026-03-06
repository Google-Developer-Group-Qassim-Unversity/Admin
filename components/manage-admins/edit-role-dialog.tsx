"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import type { MemberWithRole, MemberRole } from "@/lib/api-types";

interface EditRoleDialogProps {
  admin: MemberWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newRole: MemberRole) => void;
  isLoading?: boolean;
}

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "admin_points", label: "Admin Points" },
  { value: "super_admin", label: "Super Admin" },
];

export function EditRoleDialog({
  admin,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: EditRoleDialogProps) {
  const [selectedRole, setSelectedRole] = React.useState<MemberRole>("admin");

  React.useEffect(() => {
    if (admin) {
      setSelectedRole(admin.role);
    }
  }, [admin]);

  const handleConfirm = () => {
    if (selectedRole && selectedRole !== admin?.role) {
      onConfirm(selectedRole);
    } else {
      onOpenChange(false);
    }
  };

  if (!admin) return null;

  const isDemotingFromSuperAdmin = admin.role === "super_admin" && selectedRole !== "super_admin";
  const roleChanged = selectedRole !== admin.role;

  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case "super_admin":
        return <Badge variant="default">Super Admin</Badge>;
      case "admin_points":
        return <Badge variant="secondary">Admin Points</Badge>;
      default:
        return <Badge variant="outline">Admin</Badge>;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Role for {admin.name}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Current role:</span>
                {getRoleBadge(admin.role)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-select">New role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as MemberRole)}>
                  <SelectTrigger id="role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {roleChanged && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getRoleBadge(admin.role)}
                  <ArrowRight className="h-4 w-4" />
                  {getRoleBadge(selectedRole)}
                </div>
              )}

              {isDemotingFromSuperAdmin && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Warning: Demoting from Super Admin</p>
                    <p className="text-destructive/80 mt-1">
                      This user will lose access to manage administrators and certificates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading || !roleChanged}
          >
            {isLoading ? "Updating..." : "Update Role"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

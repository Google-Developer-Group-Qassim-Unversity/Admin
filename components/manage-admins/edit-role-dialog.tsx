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
import { useTranslations } from "next-intl";

interface EditRoleDialogProps {
  admin: MemberWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newRole: MemberRole) => void;
  isLoading?: boolean;
}

export function EditRoleDialog({
  admin,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: EditRoleDialogProps) {
  const t = useTranslations("editRole");
  const tc = useTranslations("common.actions");
  const tr = useTranslations("common.roles");
  const [selectedRole, setSelectedRole] = React.useState<MemberRole>("admin");

  const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
    { value: "admin", label: tr("admin") },
    { value: "admin_points", label: tr("adminPoints") },
    { value: "super_admin", label: tr("superAdmin") },
  ];

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
        return <Badge variant="default">{tr("superAdmin")}</Badge>;
      case "admin_points":
        return <Badge variant="secondary">{tr("adminPoints")}</Badge>;
      default:
        return <Badge variant="outline">{tr("admin")}</Badge>;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: admin.name })}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">{t("currentRole")}</span>
                {getRoleBadge(admin.role)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-select">{t("newRole")}</Label>
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
                  <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                  {getRoleBadge(selectedRole)}
                </div>
              )}

              {isDemotingFromSuperAdmin && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{t("demotingWarningTitle")}</p>
                    <p className="text-destructive/80 mt-1">
                      {t("demotingWarningDescription")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading || !roleChanged}
          >
            {isLoading ? t("updating") : t("updateRole")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

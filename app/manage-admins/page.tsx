"use client";

import * as React from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddAdminDialog } from "@/components/manage-admins/add-admin-dialog";
import { AdminListTable } from "@/components/manage-admins/admin-list-table";
import { RevokeAdminDialog } from "@/components/manage-admins/revoke-admin-dialog";
import { EditRoleDialog } from "@/components/manage-admins/edit-role-dialog";

import { getMemberRoles, updateMemberRole } from "@/lib/api";
import type { MemberWithRole, MemberRole } from "@/lib/api-types";
import { useTranslations } from "next-intl";

export default function ManageAdminsPage() {
  const t = useTranslations("manageAdminsPage");
  const tc = useTranslations("common.errors");
  const tr = useTranslations("common.roles");
  const { getToken } = useAuth();
  const { user } = useUser();

  const [admins, setAdmins] = React.useState<MemberWithRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [revokeAdmin, setRevokeAdmin] = React.useState<MemberWithRole | null>(null);
  const [editAdmin, setEditAdmin] = React.useState<MemberWithRole | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  // Fetch admins
  const fetchAdmins = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const response = await getMemberRoles(getToken);
    
    if (response.success) {
      setAdmins(response.data);
    } else {
      setError(response.error.message);
    }
    
    setIsLoading(false);
  }, [getToken]);

  // Initial fetch
  React.useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Handle revoke admin
  const handleRevokeConfirm = async () => {
    if (!revokeAdmin) return;

    setIsRevoking(true);

    try {
      // 1. Update role in backend
      const response = await updateMemberRole(
        revokeAdmin.id,
        "none",
        getToken
      );

      if (!response.success) {
        toast.error(t("revokeFailed", { error: response.error.message }));
        setIsRevoking(false);
        return;
      }

      // 2. Update Clerk metadata via API route
      const token = await getToken();
      const metadataResponse = await fetch("/api/admin/update-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId: revokeAdmin.clerk_user_id,
          uni_id: revokeAdmin.uni_id,
          role: "none",
        }),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        if (errorData.warning) {
          toast.warning(t("revokeMetadataWarning"));
        } else {
          toast.error(t("metadataFailed", { error: errorData.error }));
        }
      } else {
        toast.success(t("revokedSuccess", { name: revokeAdmin.name }));
      }

      // Close dialog and refresh
      setRevokeAdmin(null);
      fetchAdmins();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("revokeGenericFailed")
      );
    } finally {
      setIsRevoking(false);
    }
  };

  // Handle update role
  const handleRoleUpdate = async (newRole: MemberRole) => {
    if (!editAdmin) return;

    setIsUpdatingRole(true);

    try {
      // 1. Update role in backend
      const response = await updateMemberRole(
        editAdmin.id,
        newRole,
        getToken
      );

      if (!response.success) {
        toast.error(t("updateRoleFailed", { error: response.error.message }));
        setIsUpdatingRole(false);
        return;
      }

      // 2. Update Clerk metadata via API route
      const token = await getToken();
      const metadataResponse = await fetch("/api/admin/update-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId: editAdmin.clerk_user_id,
          uni_id: editAdmin.uni_id,
          role: newRole,
        }),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        if (errorData.warning) {
          toast.warning(t("updateMetadataWarning"));
        } else {
          toast.error(t("metadataFailed", { error: errorData.error }));
        }
      } else {
        toast.success(t("roleUpdatedSuccess", { name: editAdmin.name, role: tr(newRole === "admin_points" ? "adminPoints" : newRole === "super_admin" ? "superAdmin" : "admin") }));
      }

      // Close dialog and refresh
      setEditAdmin(null);
      fetchAdmins();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("updateGenericFailed")
      );
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Current user's Clerk id, used for self-revoke prevention (provider-agnostic,
  // unlike uni_id which Google-only admins don't have).
  const currentUserId = user?.id;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 me-2" />
          {t("addAdmin")}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("loadFailed")}</AlertTitle>
          <AlertDescription>
            {error}
            {error.includes("403") && (
              <span className="block mt-1">
                {tc("noPermission")}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Admin List */}
      {!isLoading && !error && (
        <AdminListTable
          admins={admins}
          currentUserId={currentUserId}
          onRevoke={setRevokeAdmin}
          onEditRole={setEditAdmin}
        />
      )}

      {/* Revoke Confirmation Dialog */}
      <RevokeAdminDialog
        admin={revokeAdmin}
        open={!!revokeAdmin}
        onOpenChange={(open) => !open && setRevokeAdmin(null)}
        onConfirm={handleRevokeConfirm}
        isLoading={isRevoking}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        admin={editAdmin}
        open={!!editAdmin}
        onOpenChange={(open) => !open && setEditAdmin(null)}
        onConfirm={handleRoleUpdate}
        isLoading={isUpdatingRole}
      />

      {/* Add Admin Dialog */}
      <AddAdminDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchAdmins}
      />
    </div>
  );
}

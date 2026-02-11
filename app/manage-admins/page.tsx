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

import { getMemberRoles, updateMemberRole } from "@/lib/api";
import type { MemberWithRole } from "@/lib/api-types";

export default function ManageAdminsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [admins, setAdmins] = React.useState<MemberWithRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [revokeAdmin, setRevokeAdmin] = React.useState<MemberWithRole | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);
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
        toast.error("Failed to revoke admin: " + response.error.message);
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
          uni_id: revokeAdmin.uni_id,
          role: "none",
        }),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        if (errorData.warning) {
          toast.warning(
            "Role revoked in database, but user not found in authentication system"
          );
        } else {
          toast.error("Failed to update authentication metadata: " + errorData.error);
        }
      } else {
        toast.success(`Successfully revoked admin access for ${revokeAdmin.name}`);
      }

      // Close dialog and refresh
      setRevokeAdmin(null);
      fetchAdmins();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke admin access"
      );
    } finally {
      setIsRevoking(false);
    }
  };

  // Get current user's uni_id for self-revoke prevention
  const currentUserUniId = user?.publicMetadata?.uni_id as string | undefined;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Admins</h1>
          <p className="text-muted-foreground mt-2">
            Add, view, and manage administrator roles and permissions
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
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
          <AlertTitle>Failed to Load Admins</AlertTitle>
          <AlertDescription>
            {error}
            {error.includes("403") && (
              <span className="block mt-1">
                You don&apos;t have permission to view this page. Super admin access is required.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Admin List */}
      {!isLoading && !error && (
        <AdminListTable
          admins={admins}
          currentUserId={currentUserUniId}
          onRevoke={setRevokeAdmin}
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

      {/* Add Admin Dialog */}
      <AddAdminDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchAdmins}
      />
    </div>
  );
}

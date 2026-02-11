"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { MemberWithRole } from "@/lib/api-types";

interface AdminListTableProps {
  admins: MemberWithRole[];
  currentUserId?: string;
  onRevoke: (admin: MemberWithRole) => void;
  isLoading?: boolean;
}

export function AdminListTable({
  admins,
  currentUserId,
  onRevoke,
  isLoading = false,
}: AdminListTableProps) {
  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <Badge variant="default" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  };

  // Filter out members with role='none'
  const activeAdmins = admins.filter((admin) => admin.role !== "none");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Admins</CardTitle>
        <CardDescription>
          {activeAdmins.length} active administrator{activeAdmins.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeAdmins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No administrators found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Uni ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAdmins.map((admin) => {
                  const isCurrentUser = currentUserId && admin.email === `${currentUserId}@qu.edu.sa`;
                  
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.uni_id}</TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRevoke(admin)}
                          disabled={isCurrentUser || isLoading}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

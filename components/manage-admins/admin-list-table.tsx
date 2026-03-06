"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert, Shield, UserMinus, Pencil, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onEditRole: (admin: MemberWithRole) => void;
  isLoading?: boolean;
}

export function AdminListTable({
  admins,
  currentUserId,
  onRevoke,
  onEditRole,
  isLoading = false,
}: AdminListTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <Badge variant="default" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    if (role === "admin_points") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="h-3 w-3" />
          Admin Points
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  };

  const activeAdmins = admins.filter((admin) => admin.role !== "none");

  const filteredAdmins = React.useMemo(() => {
    if (!searchQuery.trim()) return activeAdmins;

    const query = searchQuery.toLowerCase().trim();
    return activeAdmins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        admin.uni_id.toLowerCase().includes(query)
    );
  }, [activeAdmins, searchQuery]);

  const isCurrentUser = (admin: MemberWithRole) => 
    currentUserId && admin.uni_id === currentUserId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Admins</CardTitle>
        <CardDescription>
          {searchQuery.trim()
            ? `${filteredAdmins.length} of ${activeAdmins.length} administrator${activeAdmins.length !== 1 ? "s" : ""}`
            : `${activeAdmins.length} active administrator${activeAdmins.length !== 1 ? "s" : ""}`
          }
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or uni ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredAdmins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery.trim() ? "No matching administrators found" : "No administrators found"}</p>
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
                {filteredAdmins.map((admin) => {
                  const isCurrent = isCurrentUser(admin);
                  
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.name}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.uni_id}</TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRole(admin)}
                            disabled={isCurrent || isLoading}
                            title="Edit role"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevoke(admin)}
                            disabled={isCurrent || isLoading}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Revoke access"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
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

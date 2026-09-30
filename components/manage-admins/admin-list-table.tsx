"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert, Shield, UserMinus, Pencil, Search, EllipsisVertical } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { MemberWithRole } from "@/lib/api-types";
import { useFuzzySearch } from "@/lib/search-utils";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("adminList");
  const tr = useTranslations("common.roles");
  const [searchQuery, setSearchQuery] = React.useState("");

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <Badge variant="default" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          {tr("superAdmin")}
        </Badge>
      );
    }
    if (role === "admin_points") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="h-3 w-3" />
          {tr("adminPoints")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        {tr("admin")}
      </Badge>
    );
  };

  const activeAdmins = admins.filter((admin) => admin.role !== "none");

  const filteredAdmins = useFuzzySearch(activeAdmins, searchQuery, ["name", "email", "uni_id"]);

  const isCurrentUser = (admin: MemberWithRole) =>
    !!currentUserId && admin.clerk_user_id === currentUserId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {searchQuery.trim()
            ? t("countFiltered", { shown: filteredAdmins.length, total: activeAdmins.length })
            : t("countActive", { count: activeAdmins.length })
          }
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </CardHeader>
      <CardContent className="max-md:px-0 max-md:pb-0">
        {filteredAdmins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery.trim() ? t("noneMatch") : t("noneFound")}</p>
          </div>
        ) : (
          <>
          {/* Phones: one row per admin, edits behind a menu. Flush with the
              card edges so the list reads as part of it. */}
          <ul className="divide-border border-border divide-y border-t md:hidden">
            {filteredAdmins.map((admin) => {
              const isCurrent = isCurrentUser(admin);
              return (
                <li key={admin.id} className="flex items-start gap-2 py-3 ps-4 pe-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate text-[15px] leading-snug font-semibold" dir="auto">
                        {admin.name}
                      </span>
                      {isCurrent && <span className="text-muted-foreground shrink-0 text-xs">{t("you")}</span>}
                    </div>
                    <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px]">
                      {admin.uni_id ? (
                        <>
                          <span className="tabular shrink-0">{admin.uni_id}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      ) : null}
                      <span className="truncate" dir="ltr">
                        {admin.email}
                      </span>
                    </div>
                    <div className="pt-0.5">{getRoleBadge(admin.role)}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground shrink-0"
                        disabled={isCurrent || isLoading}
                      >
                        <EllipsisVertical />
                        <span className="sr-only">{t("columnActions")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem onSelect={() => onEditRole(admin)}>
                        <Pencil />
                        {t("editRole")}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => onRevoke(admin)}>
                        <UserMinus />
                        {t("revokeAccess")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead>{t("columnEmail")}</TableHead>
                  <TableHead>{t("columnUniId")}</TableHead>
                  <TableHead>{t("columnRole")}</TableHead>
                  <TableHead className="text-end">{t("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => {
                  const isCurrent = isCurrentUser(admin);
                  
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <span dir="auto">{admin.name}</span>
                        {isCurrent && (
                          <span className="ms-2 text-xs text-muted-foreground">{t("you")}</span>
                        )}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell className="tabular">{admin.uni_id ?? "—"}</TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRole(admin)}
                            disabled={isCurrent || isLoading}
                            title={t("editRole")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevoke(admin)}
                            disabled={isCurrent || isLoading}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={t("revokeAccess")}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

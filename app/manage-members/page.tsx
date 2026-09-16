"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
  type VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  AlertCircle,
  UserPlus,
  Users,
  Upload,
  Search,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { CreateMemberDialog } from "@/components/manage-members/create-member-dialog";
import { BatchImportDialog } from "@/components/manage-members/batch-import-dialog";

import { useMembersPaginated, useMemberStats, memberKeys } from "@/hooks/use-members";
import type { Member } from "@/lib/api-types";
import { useTranslations } from "next-intl";
import { config } from "@/lib/config";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
] as const;

// Messages come from a translator, so column defs are built per render
// rather than at module scope where `useTranslations` is unavailable.
function buildColumns(t: ReturnType<typeof useTranslations<"manageMembersPage">>): ColumnDef<Member>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ms-4"
        >
          {t("columns.name")}
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ms-4"
        >
          {t("columns.email")}
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "uni_id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ms-4"
        >
          {t("columns.universityId")}
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("uni_id") ?? "—",
    },
    {
      accessorKey: "gender",
      header: t("columns.gender"),
      cell: ({ row }) => row.getValue("gender"),
    },
    {
      accessorKey: "phone_number",
      header: t("columns.phone"),
      cell: ({ row }) => row.getValue("phone_number") || "-",
    },
    {
      accessorKey: "is_authenticated",
      header: t("columns.status"),
      cell: ({ row }) => {
        const isAuth = row.getValue("is_authenticated");
        return isAuth ? (
          <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" variant="outline">
            {t("authenticated")}
          </Badge>
        ) : (
          <Badge variant="secondary">{t("manual")}</Badge>
        );
      },
    },
    {
      accessorKey: "last_activity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ms-4"
        >
          {t("columns.lastActivity")}
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const lastActivity = row.getValue<string | null | undefined>("last_activity");
        return lastActivity ? (
          <span className="text-sm">{format(new Date(lastActivity), "MMM d, yyyy")}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("noActivity")}</span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.getValue<string | null | undefined>("last_activity");
        const b = rowB.getValue<string | null | undefined>("last_activity");
        return (a ? new Date(a).getTime() : 0) - (b ? new Date(b).getTime() : 0);
      },
    },
    {
      id: "actions",
      header: t("columns.actions"),
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="outline" size="sm" asChild>
          <a
            href={`${config.memberAppUrl}/members/${row.original.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("viewMemberPage")}
            <ExternalLink className="ms-2 h-4 w-4" />
          </a>
        </Button>
      ),
    },
  ];
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function ManageMembersPage() {
  const t = useTranslations("manageMembersPage");
  const tc = useTranslations("common.errors");
  const createMemberT = useTranslations("createMember");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const columns = React.useMemo(() => buildColumns(t), [t]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ phone_number: false });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 50 });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const sort = sorting[0];

  // The database does the searching, sorting and paging now, so any change to
  // the query means a fresh request. Snap back to the first page whenever that
  // query shape changes - otherwise a new search could strand you on a page 7
  // that no longer exists.
  React.useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [debouncedSearch, sorting, pagination.pageSize]);

  const { data, isPending, isError, error, isPlaceholderData } = useMembersPaginated({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
    sortBy: sort?.id,
    order: sort ? (sort.desc ? "desc" : "asc") : undefined,
  });
  const { data: stats } = useMemberStats();

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.total_pages ?? 0;

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: { sorting, columnVisibility, pagination },
    manualPagination: true,
    manualSorting: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRefetch = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: memberKeys.all });
  }, [queryClient]);

  const from = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min((pagination.pageIndex + 1) * pagination.pageSize, total);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Users}>
        <Button variant="outline" onClick={() => setIsBatchDialogOpen(true)}>
          <Upload className="h-4 w-4 me-2" />
          {t("batchImport")}
        </Button>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 me-2" />
          {createMemberT("createMember")}
        </Button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card size="sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">{t("stats.total")}</div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.authenticated}</div>
              <div className="text-xs text-muted-foreground">{t("stats.authenticated")}</div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.manual}</div>
              <div className="text-xs text-muted-foreground">{t("stats.manual")}</div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="text-2xl font-bold">{stats.male}</div>
              <div className="text-xs text-muted-foreground">{t("stats.male")}</div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="text-2xl font-bold">{stats.female}</div>
              <div className="text-xs text-muted-foreground">{t("stats.female")}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="me-1 h-4 w-4" />
              {t("columnsMenu")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id === "is_authenticated"
                    ? t("columns.status")
                    : column.id === "uni_id"
                      ? t("columns.universityId")
                      : column.id === "phone_number"
                        ? t("columns.phone")
                        : column.id === "name"
                          ? t("columns.name")
                          : column.id === "email"
                            ? t("columns.email")
                            : column.id === "gender"
                              ? t("columns.gender")
                              : column.id === "last_activity"
                                ? t("columns.lastActivity")
                                : column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <div className="text-sm text-muted-foreground">
          {t("memberCount", { count: total })}
          {debouncedSearch.length > 0 && stats && t("filteredFromTotal", { total: stats.total })}
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("loadFailed")}</AlertTitle>
          <AlertDescription>
            {error?.message}
            {error?.message?.includes("403") && <span className="block mt-1">{tc("noPermission")}</span>}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className={`rounded-lg border transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isPending ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={columns.length}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {debouncedSearch.length > 0 ? t("noneMatchSearch") : t("noneFound")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {t("showingRange", { from, to, count: total })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("rows")}</span>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(value) => setPagination((p) => ({ ...p, pageSize: Number(value), pageIndex: 0 }))}
                >
                  <SelectTrigger className="w-[70px]" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
              <span className="px-3 text-sm">
                {t("page", { current: pagination.pageIndex + 1, total: Math.max(pageCount, 1) })}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <CreateMemberDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleRefetch}
        getToken={getToken}
      />

      <BatchImportDialog
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        onSuccess={handleRefetch}
        getToken={getToken}
      />
    </div>
  );
}

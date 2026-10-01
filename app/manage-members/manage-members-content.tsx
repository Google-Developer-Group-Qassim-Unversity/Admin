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
  Columns3,
  ExternalLink,
  BadgeCheck,
  UserPen,
  Mars,
  Venus,
  Clock,
  EllipsisVertical,
  Mail,
} from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuItem,
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
import { FilterBar } from "@/components/filter-bar";
import { ListPager } from "@/components/list-pager";
import { StatTile } from "@/components/dashboard/stat-tile";
import { MemberStatePill } from "@/components/manage-members/member-state-pill";
import { CreateMemberDialog } from "@/components/manage-members/create-member-dialog";
import { BatchImportDialog } from "@/components/manage-members/batch-import-dialog";
import { MemberDetailsTrigger } from "@/components/member-details";

import { useMembersPaginated, useMemberStats, memberKeys } from "@/hooks/use-members";
import type { Member } from "@/lib/api-types";
import { useTranslations } from "next-intl";
import { config } from "@/lib/config";

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

// Phones get a sort Select in place of the table's clickable headers. Each
// option is just a SortingState the server already understands.
const PHONE_SORTS = {
  default: [],
  name: [{ id: "name", desc: false }],
  recent: [{ id: "last_activity", desc: true }],
} satisfies Record<string, SortingState>;
type PhoneSort = keyof typeof PHONE_SORTS;

function phoneSortOf(sorting: SortingState): PhoneSort {
  const s = sorting[0];
  if (s?.id === "name" && !s.desc) return "name";
  if (s?.id === "last_activity" && s.desc) return "recent";
  return "default";
}

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
      cell: ({ row }) => (
        <span className="font-medium" dir="auto">
          <MemberDetailsTrigger member={row.original} />
        </span>
      ),
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
      cell: ({ row }) => <span className="tabular">{row.getValue<string | null>("uni_id") ?? "—"}</span>,
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
      cell: ({ row }) => <MemberStatePill authenticated={!!row.getValue("is_authenticated")} />,
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
          <span className="tabular text-sm">{format(new Date(lastActivity), "MMM d, yyyy")}</span>
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
        // Icon-only so the seven columns fit a laptop without the table
        // scrolling sideways; the name is still announced and shown on hover.
        <Button variant="outline" size="icon-sm" asChild>
          <a
            href={`${config.memberAppUrl}/members/${row.original.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t("viewMemberPage")}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">{t("viewMemberPage")}</span>
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

export function ManageMembersContent() {
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

  const columnLabel = (id: string) =>
    id === "is_authenticated"
      ? t("columns.status")
      : id === "uni_id"
        ? t("columns.universityId")
        : id === "phone_number"
          ? t("columns.phone")
          : id === "name"
            ? t("columns.name")
            : id === "email"
              ? t("columns.email")
              : id === "gender"
                ? t("columns.gender")
                : id === "last_activity"
                  ? t("columns.lastActivity")
                  : id.replace(/_/g, " ");

  const emptyMessage = debouncedSearch.length > 0 ? t("noneMatchSearch") : t("noneFound");

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

      {/* Phones: total across the top, then a 2x2 of the breakdown. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-3.5">
        <div className="col-span-2 sm:col-span-1">
          <StatTile icon={Users} label={t("stats.total")} value={stats?.total} isPending={!stats} />
        </div>
        <StatTile
          icon={BadgeCheck}
          tone="green"
          label={t("stats.authenticated")}
          value={stats?.authenticated}
          isPending={!stats}
        />
        <StatTile icon={UserPen} label={t("stats.manual")} value={stats?.manual} isPending={!stats} />
        <StatTile icon={Mars} label={t("stats.male")} value={stats?.male} isPending={!stats} />
        <StatTile icon={Venus} label={t("stats.female")} value={stats?.female} isPending={!stats} />
      </div>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("searchPlaceholder")}
        trailing={
          <>
            <span className="tabular">
              {t("memberCount", { count: total })}
              {debouncedSearch.length > 0 && stats && t("filteredFromTotal", { total: stats.total })}
            </span>
            {/* Columns only exist on the table; phones sort with a Select instead. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:inline-flex">
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
                      {columnLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Select
              value={phoneSortOf(sorting)}
              onValueChange={(value) => setSorting([...PHONE_SORTS[value as PhoneSort]])}
            >
              <SelectTrigger size="sm" className="w-auto md:hidden" aria-label={t("sort.label")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="default">{t("sort.default")}</SelectItem>
                <SelectItem value="name">{t("sort.name")}</SelectItem>
                <SelectItem value="recent">{t("sort.recent")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

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
          {/* Phones: one compact card per member. */}
          <div
            className={`bg-card border-border overflow-hidden rounded-xl border transition-opacity md:hidden ${
              isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            {isPending ? (
              <ul className="divide-border divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="space-y-2 px-4 py-3.5">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3.5 w-4/5" />
                  </li>
                ))}
              </ul>
            ) : rows.length ? (
              <ul className="divide-border divide-y">
                {rows.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">{emptyMessage}</p>
            )}
          </div>

          <div
            className={`hidden rounded-lg border transition-opacity md:block ${isPlaceholderData ? "opacity-60" : ""}`}
          >
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
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPager
            page={pagination.pageIndex + 1}
            pageCount={pageCount}
            onPageChange={(page) => setPagination((p) => ({ ...p, pageIndex: page - 1 }))}
            pageSize={pagination.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => setPagination((p) => ({ ...p, pageSize: size, pageIndex: 0 }))}
            summary={t("showingRange", { from, to, count: total })}
          />
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

/** A member as a phone row: name, IDs, state, last seen, and a menu for the rest. */
function MemberRow({ member }: { member: Member }) {
  const t = useTranslations("manageMembersPage");
  return (
    <li className="flex items-start gap-2 py-3 ps-4 pe-2">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="truncate text-[15px] leading-snug font-semibold" dir="auto">
          <MemberDetailsTrigger member={member} />
        </div>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px]">
          {member.uni_id ? (
            <>
              <span className="tabular shrink-0">{member.uni_id}</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="truncate" dir="ltr">
            {member.email}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <MemberStatePill authenticated={!!member.is_authenticated} />
          <span className="text-muted-foreground flex items-center gap-1 text-[13px]">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t("columns.lastActivity")}: </span>
            {member.last_activity ? (
              <span className="tabular">{format(new Date(member.last_activity), "MMM d, yyyy")}</span>
            ) : (
              t("noActivity")
            )}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
            <EllipsisVertical />
            <span className="sr-only">{t("rowActions", { name: member.name })}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem asChild>
            <a
              href={`${config.memberAppUrl}/members/${member.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              {t("viewMemberPage")}
            </a>
          </DropdownMenuItem>
          {member.email ? (
            <DropdownMenuItem asChild>
              <a href={`mailto:${member.email}`}>
                <Mail />
                {t("emailMember")}
              </a>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

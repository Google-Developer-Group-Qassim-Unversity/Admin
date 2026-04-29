"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  AlertCircle,
  UserPlus,
  Upload,
  Search,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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
import { CreateMemberDialog } from "@/components/manage-members/create-member-dialog";
import { BatchImportDialog } from "@/components/manage-members/batch-import-dialog";

import { useMembers } from "@/hooks/use-members";
import type { Member } from "@/lib/api-types";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
] as const;

const columns: ColumnDef<Member>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
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
        className="-ml-4"
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "uni_id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        University ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => row.getValue("gender"),
  },
  {
    accessorKey: "phone_number",
    header: "Phone",
    cell: ({ row }) => row.getValue("phone_number") || "-",
  },
  {
    accessorKey: "is_authenticated",
    header: "Status",
    cell: ({ row }) => {
      const isAuth = row.getValue("is_authenticated");
      return isAuth ? (
        <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" variant="outline">
          Authenticated
        </Badge>
      ) : (
        <Badge variant="secondary">Manual</Badge>
      );
    },
  },
];

function getMatchScore(member: Member, searchWords: string[]): number {
  if (searchWords.length === 0) return 0;
  const nameParts = member.name.toLowerCase().split(/\s+/);
  const uniIdLower = member.uni_id.toLowerCase();
  const emailLower = member.email.toLowerCase();
  const phoneLower = (member.phone_number ?? "").toLowerCase();

  let score = 0;
  for (const word of searchWords) {
    let wordScore = 0;
    for (const part of nameParts) {
      if (part.startsWith(word)) {
        wordScore = 2;
        break;
      } else if (part.includes(word) && wordScore < 2) {
        wordScore = 1;
      }
    }
    if (wordScore < 2 && uniIdLower.includes(word)) {
      wordScore = Math.max(wordScore, 1);
    }
    if (wordScore < 2 && emailLower.includes(word)) {
      wordScore = Math.max(wordScore, 1);
    }
    if (wordScore < 1 && phoneLower.includes(word)) {
      wordScore = 1;
    }
    if (wordScore === 0) return -1;
    score += wordScore;
  }
  return score;
}

export default function ManageMembersPage() {
  const { getToken } = useAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    phone_number: false,
  });

  const { data: members, isLoading, error, refetch } = useMembers(getToken);

  const searchWords = React.useMemo(() => {
    return searchQuery
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.toLowerCase());
  }, [searchQuery]);

  const filteredMembers = React.useMemo(() => {
    if (!members) return [];
    if (searchWords.length === 0) return members;

    const scored = members
      .map((member) => ({ member, score: getMatchScore(member, searchWords) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ member }) => member);
  }, [members, searchWords]);

  const table = useReactTable({
    data: filteredMembers,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  const handleRefetch = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const totalRows = filteredMembers.length;
  const totalCount = members?.length ?? 0;

  const stats = React.useMemo(() => {
    if (!members) return null;
    const total = members.length;
    const authenticated = members.filter((m) => m.is_authenticated).length;
    const manual = total - authenticated;
    const male = members.filter((m) => m.gender === "Male").length;
    const female = members.filter((m) => m.gender === "Female").length;
    return { total, authenticated, manual, male, female };
  }, [members]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Members</h1>
          <p className="text-muted-foreground mt-2">
            View, search, and manage all members. Create members manually or batch import from Sheet Processor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBatchDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Batch Import
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Member
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Members</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.message.includes("403") && (
              <span className="block mt-1">
                You don&apos;t have permission to view this page. Super admin access is required.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Card size="sm">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Members</div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.authenticated}</div>
                  <div className="text-xs text-muted-foreground">Authenticated</div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.manual}</div>
                  <div className="text-xs text-muted-foreground">Manual</div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="text-2xl font-bold">{stats.male}</div>
                  <div className="text-xs text-muted-foreground">Male</div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="text-2xl font-bold">{stats.female}</div>
                  <div className="text-xs text-muted-foreground">Female</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
<div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, uni ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="mr-1 h-4 w-4" />
                  Columns
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
                      {column.id === "is_authenticated" ? "Status" : column.id === "uni_id" ? "University ID" : column.id === "phone_number" ? "Phone" : column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1" />

            <div className="text-sm text-muted-foreground">
              {totalRows} member{totalRows !== 1 ? "s" : ""}
              {searchWords.length > 0 && ` (filtered from ${totalCount} total)`}
            </div>

            
          </div>

          <div className="rounded-lg border">
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
                {table.getRowModel().rows?.length ? (
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
                      {searchWords.length > 0 ? "No members match your search" : "No members found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                -
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  totalRows
                )}{" "}
                of {totalRows} member{totalRows !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows:</span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                    table.setPageIndex(0);
                  }}
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
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
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
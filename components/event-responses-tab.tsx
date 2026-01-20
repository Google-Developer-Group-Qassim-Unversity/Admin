"use client";

import type { Event, Submission } from "@/lib/api-types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useSubmissions } from "@/hooks/use-submissions";
import { useFormData, useFormSchema } from "@/hooks/use-form-data";
import { FormResponse, mapSchemaToTitleAnswers } from "@/lib/googl-parser";
import { useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Columns3,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventResponsesTabProps {
  event: Event;
}

// Type for transformed table row data
// Using Record<string, unknown> to allow dynamic question keys
type TableRowData = Record<string, unknown> & {
  // Submission metadata
  submission_id: number;
  submitted_at: string;
  is_accepted: boolean;
  submission_type: string;
  // Member data (flattened)
  member_id: number;
  name: string;
  email: string;
  phone_number: string;
  uni_id: string;
  gender: string;
  uni_level: number;
  uni_college: string;
};

// Transform submissions to table rows
function transformSubmissionsToRows(
  submissions: Submission[],
  parsedGoogleSubmissions: Array<{
    submission: Submission;
    parsedAnswers: Record<string, string | string[] | null> | null;
    error?: string;
  }>
): TableRowData[] {
  // Create a map for quick lookup of parsed answers
  const parsedMap = new Map(
    parsedGoogleSubmissions.map((p) => [p.submission.submission_id, p])
  );

  return submissions.map((submission) => {
    const parsed = parsedMap.get(submission.submission_id);

    // Base row with member data
    const row: TableRowData = {
      submission_id: submission.submission_id,
      submitted_at: submission.submitted_at,
      is_accepted: submission.is_accepted,
      submission_type: submission.submission_type,
      member_id: submission.member.id,
      name: submission.member.name,
      email: submission.member.email,
      phone_number: submission.member.phone_number,
      uni_id: submission.member.uni_id,
      gender: submission.member.gender,
      uni_level: submission.member.uni_level,
      uni_college: submission.member.uni_college,
    };

    // Add parsed answers if available
    if (parsed?.parsedAnswers) {
      Object.entries(parsed.parsedAnswers).forEach(([title, answer]) => {
        // Convert arrays to comma-separated strings
        if (Array.isArray(answer)) {
          row[title] = answer.join(", ");
        } else {
          row[title] = answer;
        }
      });
    }

    return row;
  });
}

// Get dynamic question column keys from parsed submissions
function getQuestionKeys(
  parsedGoogleSubmissions: Array<{
    submission: Submission;
    parsedAnswers: Record<string, string | string[] | null> | null;
  }>
): string[] {
  // Get keys from first valid parsed submission
  const firstValid = parsedGoogleSubmissions.find((p) => p.parsedAnswers);
  if (!firstValid?.parsedAnswers) return [];
  return Object.keys(firstValid.parsedAnswers);
}

// Create column definitions
function createColumns(
  questionKeys: string[],
  onToggleAccepted: (submissionId: number, currentValue: boolean) => void
): ColumnDef<TableRowData>[] {
  // Base member columns
  const baseColumns: ColumnDef<TableRowData>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone_number",
      header: "Phone",
    },
    {
      accessorKey: "uni_id",
      header: "Uni ID",
    },
    {
      accessorKey: "gender",
      header: "Gender",
    },
    {
      accessorKey: "uni_level",
      header: "Level",
    },
    {
      accessorKey: "uni_college",
      header: "College",
    },
    {
      accessorKey: "submitted_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Submitted At
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("submitted_at"));
        return (
          <span className="text-muted-foreground">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
  ];

  // Dynamic question columns
  const questionColumns: ColumnDef<TableRowData>[] = questionKeys.map(
    (key) => ({
      accessorKey: key,
      header: key,
      cell: ({ row }) => {
        const value = row.getValue(key);
        if (value === null || value === undefined || value === "") {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="max-w-[200px] truncate block">{String(value)}</span>;
      },
    })
  );

  // Actions column
  const actionsColumn: ColumnDef<TableRowData> = {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const isAccepted = row.original.is_accepted;
      const submissionId = row.original.submission_id;
      return (
        <Button
          variant={isAccepted ? "secondary" : "outline"}
          size="sm"
          onClick={() => onToggleAccepted(submissionId, isAccepted)}
          className="gap-1"
        >
          {isAccepted ? (
            <>
              <Check className="h-3 w-3" />
              Accepted
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Pending
            </>
          )}
        </Button>
      );
    },
  };

  return [...baseColumns, ...questionColumns, actionsColumn];
}

export function EventResponsesTab({ event }: EventResponsesTabProps) {
  const { getToken } = useAuth();
  const { data: submissions, isLoading, error } = useSubmissions(event.id, getToken);
  const { data: formData } = useFormData(event.id);
  const { data: formSchema } = useFormSchema(formData?.googleFormId || null);

  // Local state for is_accepted (UI only, no backend call)
  const [acceptedState, setAcceptedState] = useState<Record<number, boolean>>({});

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submitted_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    phone_number: false,
    uni_id: false,
    uni_level: false,
    uni_college: false,
  });
  const [globalFilter, setGlobalFilter] = useState("");

  // Summary stats
  const total = submissions?.length ?? 0;
  const accepted = submissions?.filter((s) => acceptedState[s.submission_id] ?? s.is_accepted).length ?? 0;
  const pending = total - accepted;
  const noneType = submissions?.filter((s) => s.submission_type === "none").length ?? 0;
  const googleType = submissions?.filter((s) => s.submission_type === "google").length ?? 0;
  const partialType = submissions?.filter((s) => s.submission_type === "partial").length ?? 0;

  // Parse Google submissions
  const parsedGoogleSubmissions = useMemo(() => {
    if (!submissions || !formSchema) return [];

    const googleSubmissions = submissions.filter(
      (s) => s.submission_type === "google"
    );

    return googleSubmissions.map((submission) => {
      try {
        const response = {
          answers: submission.google_submission_value as unknown as FormResponse,
        };
        const parsed = mapSchemaToTitleAnswers(formSchema, [response]);
        return {
          submission,
          parsedAnswers: parsed[0] || {},
        };
      } catch (err) {
        console.error("Error parsing submission:", err);
        return {
          submission,
          parsedAnswers: null,
          error: err instanceof Error ? err.message : "Failed to parse",
        };
      }
    });
  }, [submissions, formSchema]);

  // Get question keys for dynamic columns
  const questionKeys = useMemo(
    () => getQuestionKeys(parsedGoogleSubmissions),
    [parsedGoogleSubmissions]
  );

  // Transform data for table
  const tableData = useMemo(() => {
    if (!submissions) return [];
    const rows = transformSubmissionsToRows(submissions, parsedGoogleSubmissions);
    // Apply local accepted state overrides
    return rows.map((row) => ({
      ...row,
      is_accepted: acceptedState[row.submission_id] ?? row.is_accepted,
    }));
  }, [submissions, parsedGoogleSubmissions, acceptedState]);

  // Toggle accepted handler
  const handleToggleAccepted = (submissionId: number, currentValue: boolean) => {
    setAcceptedState((prev) => ({
      ...prev,
      [submissionId]: !currentValue,
    }));
  };

  // Create columns
  const columns = useMemo(
    () => createColumns(questionKeys, handleToggleAccepted),
    [questionKeys]
  );

  // Table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Card className="max-w-full mx-auto">
      <CardHeader>
        <CardTitle>Manage Responses: {event.name}</CardTitle>
        <CardDescription>
          View and manage responses for this event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p>Loading submissions…</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p>Failed to load submissions.</p>
            <p className="mt-2 text-xs">
              {String((error as Error).message ?? error)}
            </p>
          </div>
        ) : (
          <>
            {/* Summary Statistics */}
            <div className="rounded-lg border p-6 mb-6">
              <div className="text-sm text-muted-foreground">Summary</div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">{total}</span>
                </div>
                <div className="p-2 rounded bg-green-500/10">
                  <span className="text-muted-foreground">Accepted:</span>{" "}
                  <span className="font-medium text-green-600">{accepted}</span>
                </div>
                <div className="p-2 rounded bg-yellow-500/10">
                  <span className="text-muted-foreground">Pending:</span>{" "}
                  <span className="font-medium text-yellow-600">{pending}</span>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">None:</span>{" "}
                  <span className="font-medium">{noneType}</span>
                </div>
                <div className="p-2 rounded bg-blue-500/10">
                  <span className="text-muted-foreground">Google:</span>{" "}
                  <span className="font-medium text-blue-600">{googleType}</span>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Partial:</span>{" "}
                  <span className="font-medium">{partialType}</span>
                </div>
              </div>
            </div>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Columns3 className="mr-1 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id.replace(/_/g, " ")}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Data Table */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No submissions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
                -
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} submission
                {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
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
      </CardContent>
    </Card>
  );
}

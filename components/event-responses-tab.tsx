"use client";

import type { Event } from "@/lib/api-types";
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
import {
  transformSubmissionsToRows,
  getQuestionKeys,
  createColumns,
  generateTSV,
  filterTableDataByStatus,
  getAcceptAllUpdates,
  getBulkAcceptUpdates,
  type StatusFilter,
} from "@/lib/responses-utils";
import { useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
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
import { Columns3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  TableSkeleton,
  ActionsDropdown,
  BulkAcceptDialog,
  Pagination,
} from "@/components/responses-tab-components";
import { cn } from "@/lib/utils";

interface EventResponsesTabProps {
  event: Event;
}

export function EventResponsesTab({ event }: EventResponsesTabProps) {
  const { getToken } = useAuth();
  const { data: submissions, isLoading: submissionsLoading, error } = useSubmissions(event.id, getToken);
  const { data: formData, isLoading: formDataLoading } = useFormData(event.id);
  const { data: formSchema, isLoading: formSchemaLoading } = useFormSchema(formData?.googleFormId || null);

  // Determine if we need formSchema (if googleFormId exists then its a google form, we need to wait for schema)
  // We also need to wait for formData to load to know if we need formSchema
  const needsFormSchema = !!formData?.googleFormId;
  const isFormSchemaLoading = needsFormSchema && formSchemaLoading;

  // Overall loading state: wait for submissions, formData (to know if we need schema), and formSchema if needed
  const isLoading = submissionsLoading || formDataLoading || isFormSchemaLoading;

  // Local state for is_accepted (UI only, no backend call)
  const [acceptedState, setAcceptedState] = useState<Record<number, boolean>>({});

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Bulk accept dialog state
  const [bulkAcceptDialogOpen, setBulkAcceptDialogOpen] = useState(false);

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

  // Transform data for table (without filtering)
  const allTableData = useMemo(() => {
    if (!submissions) return [];
    const rows = transformSubmissionsToRows(submissions, parsedGoogleSubmissions);
    // Apply local accepted state overrides
    return rows.map((row) => ({
      ...row,
      is_accepted: acceptedState[row.submission_id] ?? row.is_accepted,
    }));
  }, [submissions, parsedGoogleSubmissions, acceptedState]);

  // Apply status filter to table data
  const tableData = useMemo(() => {
    return filterTableDataByStatus(allTableData, statusFilter);
  }, [allTableData, statusFilter]);

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

  // Copy all data as TSV
  const handleCopyAsTSV = () => {
    try {
      // Get all filtered rows (not just current page)
      const allRows = table.getFilteredRowModel().rows.map((row) => row.original);

      // Generate TSV content using utility function
      const tsvContent = generateTSV(allRows, columns, columnVisibility);

      // Copy to clipboard
      navigator.clipboard.writeText(tsvContent).then(() => {
        toast.success(`Copied ${allRows.length} row${allRows.length !== 1 ? "s" : ""} as TSV`);
      }).catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy data to clipboard");
      });
    } catch (error) {
      console.error("Error generating TSV:", error);
      toast.error("Failed to generate TSV data");
    }
  };

  // Accept all filtered rows
  const handleAcceptAll = () => {
    const allRows = table.getFilteredRowModel().rows.map((row) => row.original);
    const updates = getAcceptAllUpdates(allRows, acceptedState);
    setAcceptedState(updates);
    toast.success(`Accepted ${allRows.length} submission${allRows.length !== 1 ? "s" : ""}`);
  };

  // Accept bulk by Uni IDs
  const handleAcceptBulk = (uniIds: string[]) => {
    // Use allTableData to search through all submissions (not just filtered)
    const { updates, acceptedCount } = getBulkAcceptUpdates(
      allTableData,
      uniIds,
      acceptedState
    );
    setAcceptedState(updates);
    
    if (acceptedCount > 0) {
      toast.success(
        `Accepted ${acceptedCount} submission${acceptedCount !== 1 ? "s" : ""} by Uni ID`
      );
    } else {
      toast.warning("No submissions found matching the provided Uni IDs");
    }
  };

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
          <TableSkeleton />
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
              </div>
            </div>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: StatusFilter) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[150px]" size="sm">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="not_accepted">Not Accepted</SelectItem>
                </SelectContent>
              </Select>

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

              {/* Actions Dropdown */}
              <ActionsDropdown
                onCopyAsTSV={handleCopyAsTSV}
                onAcceptAll={handleAcceptAll}
                onAcceptBulk={() => setBulkAcceptDialogOpen(true)}
                filteredRowCount={table.getFilteredRowModel().rows.length}
              />

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
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
                        className={cn(
                          row.original.is_accepted &&
                            "bg-green-50 dark:bg-green-950/20"
                        )}
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
            <Pagination table={table} />
          </>
        )}
      </CardContent>
      <BulkAcceptDialog
        open={bulkAcceptDialogOpen}
        onOpenChange={setBulkAcceptDialogOpen}
        onSubmit={handleAcceptBulk}
      />
    </Card>
  );
}

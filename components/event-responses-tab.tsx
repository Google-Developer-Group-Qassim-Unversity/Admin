"use client";

import type { Event } from "@/lib/api-types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useSubmissions, useAcceptSubmissions } from "@/hooks/use-submissions";
import { useFormData, useFormSchema } from "@/hooks/use-form-data";
import { useUpdateEvent } from "@/hooks/use-event";
import { FormResponse, mapSchemaToTitleAnswers } from "@/lib/googl-parser";
import {
  transformSubmissionsToRows,
  getQuestionKeys,
  createColumns,
  generateTSV,
  filterTableDataByStatus,
  getAcceptAllPayload,
  getBulkAcceptPayload,
  getToggleSelectedPayload,
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
  type RowSelectionState,
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
import { Columns3, Search, FileX, Loader2, Lock } from "lucide-react";
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
  AcceptAllDialog,
  Pagination,
  SelectedRowsActions,
  StatusAlert,
  SummaryStatistics,
} from "@/components/responses-tab-components";
import { cn } from "@/lib/utils";

interface EventResponsesTabProps {
  event: Event;
  onEventChange?: () => void;
}

export function EventResponsesTab({ event, onEventChange }: EventResponsesTabProps) {
  const { getToken } = useAuth();
  const { data: submissions, isLoading: submissionsLoading, error } = useSubmissions(event.id, getToken);
  const { data: formData, isLoading: formDataLoading } = useFormData(event.id);
  const { data: formSchema, isLoading: formSchemaLoading } = useFormSchema(formData?.googleFormId || null);
  const acceptSubmissionsMutation = useAcceptSubmissions(getToken);
  const updateEventMutation = useUpdateEvent(getToken);

  // Determine if we need formSchema (if googleFormId exists then its a google form, we need to wait for schema)
  // We also need to wait for formData to load to know if we need formSchema
  const needsFormSchema = !!formData?.googleFormId;
  const isFormSchemaLoading = needsFormSchema && formSchemaLoading;

  // Overall loading state: wait for submissions, formData (to know if we need schema), and formSchema if needed
  const isLoading = submissionsLoading || formDataLoading || isFormSchemaLoading;

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Bulk accept dialog state
  const [bulkAcceptDialogOpen, setBulkAcceptDialogOpen] = useState(false);
  
  // Accept all confirmation dialog state
  const [acceptAllDialogOpen, setAcceptAllDialogOpen] = useState(false);

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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Summary stats
  const total = submissions?.length ?? 0;
  const accepted = submissions?.filter((s) => s.is_accepted).length ?? 0;
  const pending = total - accepted;

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
    return transformSubmissionsToRows(submissions, parsedGoogleSubmissions);
  }, [submissions, parsedGoogleSubmissions]);

  // Apply status filter to table data
  const tableData = useMemo(() => {
    return filterTableDataByStatus(allTableData, statusFilter);
  }, [allTableData, statusFilter]);

  // Create columns
  const columns = useMemo(
    () => createColumns(questionKeys),
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
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => String(row.submission_id),
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

  // Open accept all confirmation dialog
  const handleAcceptAllClick = () => {
    setAcceptAllDialogOpen(true);
  };

  // Accept all filtered rows (called after confirmation)
  const handleAcceptAll = async () => {
    const allRows = table.getFilteredRowModel().rows.map((row) => row.original);
    const payload = getAcceptAllPayload(allRows);
    
    if (payload.length === 0) return;
    
    try {
      await acceptSubmissionsMutation.mutateAsync(payload);
      toast.success(`Accepted ${allRows.length} submission${allRows.length !== 1 ? "s" : ""}`);
      setAcceptAllDialogOpen(false);
    } catch (error) {
      console.error("Failed to accept submissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to accept submissions");
    }
  };

  // Accept bulk by Uni IDs
  const handleAcceptBulk = async (uniIds: string[]) => {
    // Use allTableData to search through all submissions (not just filtered)
    const { payload, acceptedCount } = getBulkAcceptPayload(allTableData, uniIds);
    
    if (acceptedCount === 0) {
      toast.warning("No submissions found matching the provided Uni IDs");
      return;
    }
    
    try {
      await acceptSubmissionsMutation.mutateAsync(payload);
      toast.success(
        `Accepted ${acceptedCount} submission${acceptedCount !== 1 ? "s" : ""} by Uni ID`
      );
      // Close dialog after successful submission
      setBulkAcceptDialogOpen(false);
    } catch (error) {
      console.error("Failed to accept submissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to accept submissions");
    }
  };

  // Toggle acceptance for selected rows
  const handleAcceptSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
    if (selectedRows.length === 0) return;
    
    const { payload, allAccepted } = getToggleSelectedPayload(selectedRows);
    
    try {
      await acceptSubmissionsMutation.mutateAsync(payload);
      setRowSelection({});
      
      const action = allAccepted ? "Removed acceptance from" : "Accepted";
      toast.success(`${action} ${selectedRows.length} submission${selectedRows.length !== 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Failed to update submissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update submissions");
    }
  };

  // Check if all selected rows are accepted
  const allSelectedAccepted = useMemo(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
    return selectedRows.length > 0 && selectedRows.every((row) => row.is_accepted);
    // rowSelection is needed to recalculate when selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, rowSelection]);

  // Handle closing responses (open → active)
  const handleCloseResponses = async () => {
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        data: { ...event, status: 'active' },
      });
      toast.success('Responses have been closed. Event is now active.');
      onEventChange?.();
    } catch {
      toast.error('Failed to close responses. Please try again.');
    }
  };

  // Early return for form_type 'none'
  if (!formDataLoading && formData?.formType === 'none') {
    return (
      <Card className="max-w-full mx-auto">
        <CardHeader>
          <CardTitle>Manage Responses: {event.name}</CardTitle>
          <CardDescription>
            View and manage responses for this event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-12 text-center">
            <FileX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Signups Required</h3>
            <p className="text-muted-foreground">
              This event does not require signups. Responses are not being collected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            {/* Status Alert */}
            <StatusAlert
              eventStatus={event.status}
              formType={formData?.formType}
            />

            {/* Summary Statistics */}
            <SummaryStatistics total={total} accepted={accepted} pending={pending} />

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

              {/* Selected Rows Actions */}
              <SelectedRowsActions
                selectedCount={table.getFilteredSelectedRowModel().rows.length}
                allAccepted={allSelectedAccepted}
                onAcceptSelected={handleAcceptSelected}
                isLoading={acceptSubmissionsMutation.isPending}
              />

              {/* Actions Dropdown */}
              <ActionsDropdown
                onCopyAsTSV={handleCopyAsTSV}
                onAcceptAll={handleAcceptAllClick}
                onAcceptBulk={() => setBulkAcceptDialogOpen(true)}
                filteredRowCount={table.getFilteredRowModel().rows.length}
                isLoading={acceptSubmissionsMutation.isPending}
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

              {/* Close Responses Button */}
              {event.status === 'open' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCloseResponses}
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Close Responses
                    </>
                  )}
                </Button>
              )}
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
                            "bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50"
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
        isLoading={acceptSubmissionsMutation.isPending}
      />
      
      <AcceptAllDialog
        open={acceptAllDialogOpen}
        onOpenChange={setAcceptAllDialogOpen}
        onSubmit={handleAcceptAll}
        submissionCount={table.getFilteredRowModel().rows.length}
        isLoading={acceptSubmissionsMutation.isPending}
      />
    </Card>
  );
}

"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useSubmissions, useAcceptSubmissions } from "@/hooks/use-submissions";
import { useFormData, useFormSchema } from "@/hooks/use-form-data";
import { useCloseEventResponses } from "@/hooks/use-event";
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
  SummaryStatistics,
} from "@/components/responses-tab-components";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useEventContext } from "@/contexts/event-context";

export default function EventResponsesPage() {
  const { event, refetch } = useEventContext();
  const { getToken } = useAuth();
  const { data: submissions, isLoading: submissionsLoading, error } = useSubmissions(event?.id ?? 0, getToken);
  const { data: formData, isLoading: formDataLoading } = useFormData(event?.id ?? 0);
  const { data: formSchema, isLoading: formSchemaLoading } = useFormSchema(formData?.googleFormId || null);
  const acceptSubmissionsMutation = useAcceptSubmissions(getToken);
  const closeResponsesMutation = useCloseEventResponses(getToken);

  if (!event) {
    return null;
  }

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return undefined;
    return submissions.filter((s) => s.submission_type !== "partial");
  }, [submissions]);

  const needsFormSchema = !!formData?.googleFormId;
  const isFormSchemaLoading = needsFormSchema && formSchemaLoading;

  const isLoading = submissionsLoading || formDataLoading || isFormSchemaLoading;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bulkAcceptDialogOpen, setBulkAcceptDialogOpen] = useState(false);
  const [acceptAllDialogOpen, setAcceptAllDialogOpen] = useState(false);
  const [closeResponsesDialogOpen, setCloseResponsesDialogOpen] = useState(false);

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

  const total = filteredSubmissions?.length ?? 0;
  const accepted = filteredSubmissions?.filter((s) => s.is_accepted).length ?? 0;
  const pending = total - accepted;

  const parsedGoogleSubmissions = useMemo(() => {
    if (!filteredSubmissions || !formSchema) return [];

    const googleSubmissions = filteredSubmissions.filter(
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
  }, [filteredSubmissions, formSchema]);

  const questionKeys = useMemo(
    () => getQuestionKeys(parsedGoogleSubmissions),
    [parsedGoogleSubmissions]
  );

  const allTableData = useMemo(() => {
    if (!filteredSubmissions) return [];
    return transformSubmissionsToRows(filteredSubmissions, parsedGoogleSubmissions);
  }, [filteredSubmissions, parsedGoogleSubmissions]);

  const tableData = useMemo(() => {
    return filterTableDataByStatus(allTableData, statusFilter);
  }, [allTableData, statusFilter]);

  const columns = useMemo(
    () => createColumns(questionKeys),
    [questionKeys]
  );

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

  const handleCopyAsTSV = () => {
    try {
      const allRows = table.getFilteredRowModel().rows.map((row) => row.original);
      const tsvContent = generateTSV(allRows, columns, columnVisibility);

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

  const handleCopyAcceptedEmails = () => {
    if (!filteredSubmissions) {
      toast.error("No submissions available");
      return;
    }

    try {
      const acceptedEmails = filteredSubmissions
        .filter((submission) => submission.is_accepted)
        .map((submission) => submission.member.email)
        .filter((email) => email && email.trim() !== "");

      if (acceptedEmails.length === 0) {
        toast.warning("No accepted submissions with emails found");
        return;
      }

      const emailsText = acceptedEmails.join(", ");

      navigator.clipboard.writeText(emailsText).then(() => {
        toast.success(`Copied ${acceptedEmails.length} email${acceptedEmails.length !== 1 ? "s" : ""} to clipboard`);
      }).catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy emails to clipboard");
      });
    } catch (error) {
      console.error("Error copying emails:", error);
      toast.error("Failed to copy emails");
    }
  };

  const handleAcceptAllClick = () => {
    setAcceptAllDialogOpen(true);
  };

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

  const handleAcceptBulk = async (uniIds: string[]) => {
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
      setBulkAcceptDialogOpen(false);
    } catch (error) {
      console.error("Failed to accept submissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to accept submissions");
    }
  };

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

  const allSelectedAccepted = useMemo(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
    return selectedRows.length > 0 && selectedRows.every((row) => row.is_accepted);
  }, [table, rowSelection]);

  const handleCloseResponsesClick = () => {
    setCloseResponsesDialogOpen(true);
  };

  const handleCloseResponses = async () => {
    try {
      await closeResponsesMutation.mutateAsync(event.id);
      toast.success('Responses have been closed. Event is now active.');
      setCloseResponsesDialogOpen(false);
      refetch?.();
    } catch {
      toast.error('Failed to close responses. Please try again.');
    }
  };

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
            <SummaryStatistics total={total} accepted={accepted} pending={pending} />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
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

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8"
                />
              </div>

              <SelectedRowsActions
                selectedCount={table.getFilteredSelectedRowModel().rows.length}
                allAccepted={allSelectedAccepted}
                onAcceptSelected={handleAcceptSelected}
                isLoading={acceptSubmissionsMutation.isPending}
              />

              <ActionsDropdown
                onCopyAsTSV={handleCopyAsTSV}
                onAcceptAll={handleAcceptAllClick}
                onAcceptBulk={() => setBulkAcceptDialogOpen(true)}
                onCopyAcceptedEmails={handleCopyAcceptedEmails}
                filteredRowCount={table.getFilteredRowModel().rows.length}
                isLoading={acceptSubmissionsMutation.isPending}
              />

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

              {event.status === 'open' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCloseResponsesClick}
                  disabled={closeResponsesMutation.isPending}
                >
                  {closeResponsesMutation.isPending ? (
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
      
      <AlertDialog open={closeResponsesDialogOpen} onOpenChange={(open) => {
        if (!closeResponsesMutation.isPending) {
          setCloseResponsesDialogOpen(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Responses?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close responses for this event? Once closed, the event status will change from &quot;open&quot; to &quot;active&quot; and no new responses will be accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeResponsesMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleCloseResponses}
              disabled={closeResponsesMutation.isPending}
            >
              {closeResponsesMutation.isPending ? (
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useSubmissions, useAcceptSubmissions } from "@/hooks/use-submissions";
import { useSendAcceptance, useSendAcceptanceTest } from "@/hooks/use-acceptance";
import { useFormData, useFormSchema } from "@/hooks/use-form-data";
import { useCloseEventResponses, useOpenEventResponses } from "@/hooks/use-event";
import { FormResponse, mapSchemaToTitleAnswers } from "@/lib/googl-parser";
import {
  transformSubmissionsToRows,
  getQuestionKeys,
  getDuplicateQuestionKeys,
  createColumns,
  generateTSV,
  filterTableDataByStatus,
  getAcceptAllPayload,
  getBulkAcceptPayload,
  getToggleSelectedPayload,
  type StatusFilter,
} from "@/lib/responses-utils";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeArabic } from "@/lib/search-utils";
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
import { Columns3, Search, FileX, Loader2, Lock, Unlock, RefreshCw } from "lucide-react";
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
  SendAcceptanceDialog,
  SendAcceptanceButton,
  ResponseCardList,
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
import { useEventContext } from "@/contexts/event-context";
import { useTranslations } from "next-intl";
import { isolate } from "@/lib/format";

export default function EventResponsesPage() {
  const t = useTranslations("responsesPage");
  const tc = useTranslations("common.actions");
  const { event, refetch } = useEventContext();
  const { getToken } = useAuth();
  const { data: submissions, isLoading: submissionsLoading, error, refetch: refetchSubmissions } = useSubmissions(event?.id ?? 0, getToken);
  const { data: formData, isLoading: formDataLoading } = useFormData(event?.id ?? 0);
  const { data: formSchema, isLoading: formSchemaLoading } = useFormSchema(formData?.id, getToken);
  const acceptSubmissionsMutation = useAcceptSubmissions(getToken);
  const closeResponsesMutation = useCloseEventResponses();
  const openResponsesMutation = useOpenEventResponses();
  const sendAcceptanceMutation = useSendAcceptance(getToken);
  const sendAcceptanceTestMutation = useSendAcceptanceTest(getToken);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bulkAcceptDialogOpen, setBulkAcceptDialogOpen] = useState(false);
  const [acceptAllDialogOpen, setAcceptAllDialogOpen] = useState(false);
  const [toggleResponsesDialogOpen, setToggleResponsesDialogOpen] = useState(false);
  const [sendAcceptanceDialogOpen, setSendAcceptanceDialogOpen] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "submitted_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    phone_number: false,
    uni_id: false,
    uni_level: false,
    uni_college: false,
    gender: false,
  });
  const appliedDuplicateDefaultsRef = useRef(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return undefined;
    return submissions.filter((s) => s.submission_type !== "partial");
  }, [submissions]);

  const needsFormSchema = !!formData?.googleFormId;
  const isFormSchemaLoading = needsFormSchema && formSchemaLoading;

  const isLoading = submissionsLoading || formDataLoading || isFormSchemaLoading;

  const total = filteredSubmissions?.length ?? 0;
  const accepted = filteredSubmissions?.filter((s) => s.is_accepted).length ?? 0;
  const invited = filteredSubmissions?.filter((s) => s.is_invited).length ?? 0;
  const acceptedNotInvited = filteredSubmissions?.filter((s) => s.is_accepted && !s.is_invited).length ?? 0;
  const pending = total - accepted;

  const acceptanceRecipients = useMemo(() => {
    if (!filteredSubmissions) return [];
    return filteredSubmissions
      .filter((s) => s.is_accepted && !s.is_invited)
      .map((s) => ({
        name: s.member.name,
        email: s.member.email,
      }));
  }, [filteredSubmissions]);

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

  useEffect(() => {
    if (appliedDuplicateDefaultsRef.current || questionKeys.length === 0) return;
    appliedDuplicateDefaultsRef.current = true;

    const duplicateKeys = getDuplicateQuestionKeys(allTableData, questionKeys);
    if (duplicateKeys.length === 0) return;

    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const key of duplicateKeys) next[key] = false;
      return next;
    });
  }, [allTableData, questionKeys]);

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
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = normalizeArabic(String(filterValue));
      if (!search) return true;
      return row.getVisibleCells().some((cell) => {
        const value = cell.getValue();
        if (value == null) return false;
        return normalizeArabic(String(value)).includes(search);
      });
    },
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
        toast.success(t("copiedRowsAsTsv", { count: allRows.length }));
      }).catch((err) => {
        console.error("Failed to copy:", err);
        toast.error(t("copyFailed"));
      });
    } catch (error) {
      console.error("Error generating TSV:", error);
      toast.error(t("generateTsvFailed"));
    }
  };

  const handleCopyAcceptedEmails = () => {
    if (!filteredSubmissions) {
      toast.error(t("noSubmissions"));
      return;
    }

    try {
      const acceptedEmails = filteredSubmissions
        .filter((submission) => submission.is_accepted)
        .map((submission) => submission.member.email)
        .filter((email) => email && email.trim() !== "");

      if (acceptedEmails.length === 0) {
        toast.warning(t("noAcceptedWithEmails"));
        return;
      }

      const emailsText = acceptedEmails.join(", ");

      navigator.clipboard.writeText(emailsText).then(() => {
        toast.success(t("copiedEmails", { count: acceptedEmails.length }));
      }).catch((err) => {
        console.error("Failed to copy:", err);
        toast.error(t("copyEmailsFailed"));
      });
    } catch (error) {
      console.error("Error copying emails:", error);
      toast.error(t("copyEmailsGenericFailed"));
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
      toast.success(t("acceptedCount", { count: allRows.length }));
      setAcceptAllDialogOpen(false);
    } catch (error) {
      console.error("Failed to accept submissions:", error);
      toast.error(error instanceof Error ? error.message : t("acceptFailed"));
    }
  };

  const handleAcceptBulk = async (emails: string[]) => {
    const { payload, acceptedCount } = getBulkAcceptPayload(allTableData, emails);

    if (acceptedCount === 0) {
      toast.warning(t("noMatchingEmails"));
      return;
    }

    try {
      await acceptSubmissionsMutation.mutateAsync(payload);
      toast.success(t("acceptedByEmail", { count: acceptedCount }));
      setBulkAcceptDialogOpen(false);
    } catch (error) {
      console.error("Failed to accept submissions:", error);
      toast.error(error instanceof Error ? error.message : t("acceptFailed"));
    }
  };

  const handleAcceptSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
    if (selectedRows.length === 0) return;
    
    const { payload, allAccepted } = getToggleSelectedPayload(selectedRows);
    
    try {
      await acceptSubmissionsMutation.mutateAsync(payload);
      setRowSelection({});
      
      toast.success(
        allAccepted
          ? t("removedAcceptanceFrom", { count: selectedRows.length })
          : t("acceptedFrom", { count: selectedRows.length })
      );
    } catch (error) {
      console.error("Failed to update submissions:", error);
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
    }
  };

  // Computed each render: `table` is a stable instance, so memoising on it
  // froze this at whatever the first selection was.
  const selectedResponses = table.getFilteredSelectedRowModel().rows;
  const allSelectedAccepted =
    selectedResponses.length > 0 && selectedResponses.every((row) => row.original.is_accepted);

  if (!event) {
    return null;
  }

  const handleToggleResponsesClick = () => {
    setToggleResponsesDialogOpen(true);
  };

  const handleCloseResponses = async () => {
    try {
      await closeResponsesMutation.mutateAsync(event.id);
      toast.success(t('closedSuccess'));
      setToggleResponsesDialogOpen(false);
      refetch?.();
    } catch {
      toast.error(t('closeFailed'));
    }
  };

  const handleOpenResponses = async () => {
    try {
      await openResponsesMutation.mutateAsync(event.id);
      toast.success(t('openedSuccess'));
      setToggleResponsesDialogOpen(false);
      refetch?.();
    } catch {
      toast.error(t('openFailed'));
    }
  };

  const handleSendAcceptance = async (subject: string, htmlContent: string) => {
    try {
      // The backend queues the send and returns immediately, so this reports
      // what was queued rather than what was delivered - and it reports the
      // count the backend actually claimed, not the one this page had counted,
      // which can differ if somebody accepted a response in the meantime.
      const queued = await sendAcceptanceMutation.mutateAsync({
        eventId: event.id,
        subject,
        htmlContent,
      });
      toast.success(t("acceptanceQueuedCount", { count: queued.recipient_count }));
      setSendAcceptanceDialogOpen(false);
    } catch (error) {
      console.error("Failed to send acceptance emails:", error);
      toast.error(error instanceof Error ? error.message : t("sendAcceptanceFailed"));
    }
  };

  const handleSendAcceptanceTest = async (subject: string, htmlContent: string, emails: string[]) => {
    try {
      await sendAcceptanceTestMutation.mutateAsync({
        subject,
        htmlContent,
        emails,
      });
      toast.success(t("testSentCount", { count: emails.length }));
    } catch (error) {
      console.error("Failed to send test acceptance emails:", error);
      toast.error(error instanceof Error ? error.message : t("sendTestFailed"));
    }
  };

  const canToggleResponses = event.status === 'open' || event.status === 'active';
  const toggleResponsesButton = canToggleResponses ? (
    <Button
        variant={event.status === 'open' ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggleResponsesClick}
        disabled={closeResponsesMutation.isPending || openResponsesMutation.isPending}
      >
        {event.status === 'open' ? (
          closeResponsesMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              {t("closing")}
            </>
          ) : (
            <>
              <Lock />
              {t("closeResponses")}
            </>
          )
        ) : (
          openResponsesMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              {t("opening")}
            </>
          ) : (
            <>
              <Unlock />
              {t("openResponses")}
            </>
          )
        )}
      </Button>
  ) : null;

  if (!formDataLoading && formData?.formType === 'none') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX />
          </EmptyMedia>
          <EmptyTitle>{t("noSignupsTitle")}</EmptyTitle>
          <EmptyDescription>{t("noSignupsDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section aria-labelledby="responses-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="responses-title" className="sr-only">
          {t("title", { name: isolate(event.name) })}
        </h2>
        <p className="text-ink-2 text-[13.5px]">{t("subtitle")}</p>
      </div>
      <div>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("loadSubmissionsFailed")}</AlertTitle>
            <AlertDescription>{String((error as Error).message ?? error)}</AlertDescription>
          </Alert>
        ) : (
          <>
            <SummaryStatistics total={total} accepted={accepted} pending={pending} invited={invited} acceptedNotInvited={acceptedNotInvited} />

            {/* Phone toolbar: search, then filter + actions, then the two
                event-level actions. Desktop keeps the one-row toolbar below. */}
            <div className="mb-4 space-y-2 md:hidden">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
                  <Input
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder={t("searchByName")}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchSubmissions()}
                  disabled={submissionsLoading}
                  aria-label={t("refresh")}
                  className="shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${submissionsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value: StatusFilter) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-full" aria-label={t("filterStatus")}>
                    <SelectValue placeholder={t("filterStatus")} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                    <SelectItem value="accepted">{t("filters.accepted")}</SelectItem>
                    <SelectItem value="not_accepted">{t("filters.notAccepted")}</SelectItem>
                    <SelectItem value="accepted_invited">{t("filters.acceptedInvited")}</SelectItem>
                    <SelectItem value="accepted_not_invited">{t("filters.acceptedNotInvited")}</SelectItem>
                  </SelectContent>
                </Select>
                <ActionsDropdown
                  onCopyAsTSV={handleCopyAsTSV}
                  onAcceptAll={handleAcceptAllClick}
                  onAcceptBulk={() => setBulkAcceptDialogOpen(true)}
                  onCopyAcceptedEmails={handleCopyAcceptedEmails}
                  filteredRowCount={table.getFilteredRowModel().rows.length}
                  isLoading={acceptSubmissionsMutation.isPending}
                  className="w-full justify-between"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 *:w-full">
                <SendAcceptanceButton
                  onClick={() => setSendAcceptanceDialogOpen(true)}
                  recipientCount={acceptedNotInvited}
                  isLoading={sendAcceptanceMutation.isPending}
                />
                {toggleResponsesButton}
              </div>
            </div>

            <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
              <Select
                value={statusFilter}
                onValueChange={(value: StatusFilter) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t("filterStatus")} />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  <SelectItem value="accepted">{t("filters.accepted")}</SelectItem>
                  <SelectItem value="not_accepted">{t("filters.notAccepted")}</SelectItem>
                  <SelectItem value="accepted_invited">{t("filters.acceptedInvited")}</SelectItem>
                  <SelectItem value="accepted_not_invited">{t("filters.acceptedNotInvited")}</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-64 max-w-sm">
                <Search className="text-ink-2 pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
                <Input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  placeholder={t("searchByName")}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="ps-9"
                />
              </div>

              <SelectedRowsActions
                selectedCount={table.getFilteredSelectedRowModel().rows.length}
                className="max-md:hidden"
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
                    <Columns3 />
                    {t("columns")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-50">
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

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSubmissions()}
                disabled={submissionsLoading}
              >
                <RefreshCw className={submissionsLoading ? "animate-spin" : ""} />
                {t("refresh")}
              </Button>

              <SendAcceptanceButton
                onClick={() => setSendAcceptanceDialogOpen(true)}
                recipientCount={acceptedNotInvited}
                isLoading={sendAcceptanceMutation.isPending}
              />

              {toggleResponsesButton}
            </div>

            <div className="md:hidden">
              <ResponseCardList table={table} questionKeys={questionKeys} emptyLabel={t("noneFound")} />
            </div>

            <div className="bg-card ring-rule hidden overflow-hidden rounded-xl ring-1 md:block">
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
                        className="h-24 text-center text-ink-2"
                      >
                        {t("noneFound")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Pagination table={table} />

            {/* Phone bulk bar - fixed above the tab bar while rows are ticked. */}
            <SelectedRowsActions
              variant="floating"
              className="md:hidden"
              selectedCount={table.getFilteredSelectedRowModel().rows.length}
              allAccepted={allSelectedAccepted}
              onAcceptSelected={handleAcceptSelected}
              onClearSelection={() => setRowSelection({})}
              isLoading={acceptSubmissionsMutation.isPending}
            />
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <div aria-hidden="true" className="h-20 md:hidden" />
            )}
          </>
        )}
      </div>
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
      
      <AlertDialog open={toggleResponsesDialogOpen} onOpenChange={(open) => {
        if (!(closeResponsesMutation.isPending || openResponsesMutation.isPending)) {
          setToggleResponsesDialogOpen(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {event.status === 'open' ? t('closeConfirmTitle') : t('openConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {event.status === 'open'
                ? t('closeConfirmDescription')
                : t('openConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeResponsesMutation.isPending || openResponsesMutation.isPending}>
              {tc("cancel")}
            </AlertDialogCancel>
            <Button
              onClick={event.status === 'open' ? handleCloseResponses : handleOpenResponses}
              disabled={closeResponsesMutation.isPending || openResponsesMutation.isPending}
            >
              {event.status === 'open' ? (
                closeResponsesMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("closing")}
                  </>
                ) : (
                  <>
                    <Lock />
                    {t("closeResponses")}
                  </>
                )
              ) : (
                openResponsesMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("opening")}
                  </>
                ) : (
                  <>
                    <Unlock />
                    {t("openResponses")}
                  </>
                )
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SendAcceptanceDialog
        open={sendAcceptanceDialogOpen}
        onOpenChange={setSendAcceptanceDialogOpen}
        recipients={acceptanceRecipients}
        onSubmit={handleSendAcceptance}
        onTestSubmit={handleSendAcceptanceTest}
        isLoading={sendAcceptanceMutation.isPending}
        isTestLoading={sendAcceptanceTestMutation.isPending}
        event={event ?? undefined}
      />
    </section>
  );
}

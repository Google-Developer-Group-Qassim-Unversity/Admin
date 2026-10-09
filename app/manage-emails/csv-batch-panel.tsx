"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Settings2,
  Calendar,
  AlertCircle,
  Upload,
  Plus,
  Trash2,
  Send,
  Loader2,
  Check,
  ChevronsUpDown,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { normalizeArabic } from "@/lib/search-utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { sendManualCertificate, getSubmissions } from "@/lib/api";
import type { Event, Submission, EmailProvider } from "@/lib/api-types";

import type { CsvRow } from "./types";
import { AttendanceVerifyDialog } from "./attendance-verify-dialog";
import { EmailJobStatusCard } from "@/components/email-job-status-card";
import { FormActions } from "@/components/form-actions";
import { SOFT } from "@/components/najdi";
import { useTranslations } from "next-intl";

interface CsvBatchPanelProps {
  events: Event[];
  onGoToLogs?: () => void;
  provider: EmailProvider;
}

function formatEventDate(event: Event): string {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start.toDateString() === end.toDateString()) return startStr;
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

export function CsvBatchPanel({ events, onGoToLogs, provider }: CsvBatchPanelProps) {
  const t = useTranslations("manageEmails.csvBatch");
  const tSend = useTranslations("manageEmails.sendCertificates");
  const tDirect = useTranslations("manageEmails.directEmail");
  const tc = useTranslations("common.actions");
  const { getToken } = useAuth();

  const [csvRows, setCsvRows] = React.useState<CsvRow[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [useCustomColumns, setUseCustomColumns] = React.useState(false);
  const [customNameCol, setCustomNameCol] = React.useState("name");
  const [customEmailCol, setCustomEmailCol] = React.useState("email");

  const [hasEventColumn, setHasEventColumn] = React.useState(true);
  const [batchSelectedEventId, setBatchSelectedEventId] = React.useState<number | null>(null);
  const [batchComboboxOpen, setBatchComboboxOpen] = React.useState(false);
  const batchSelectedEvent = events.find((e) => e.id === batchSelectedEventId);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckingAttendance, setIsCheckingAttendance] = React.useState(false);
  const [jobResults, setJobResults] = React.useState<{ jobId: number | null | undefined; total: number }[]>([]);
  const [failedCount, setFailedCount] = React.useState(0);

  const [unverifiedRows, setUnverifiedRows] = React.useState<CsvRow[]>([]);
  const [showVerifyDialog, setShowVerifyDialog] = React.useState(false);

  const verifyAttendance = React.useCallback(
    async (rows: CsvRow[]) => {
      const rowsWithEvent = rows.filter((r) => r.matchedEvent);
      if (rowsWithEvent.length === 0) {
        setCsvRows(rows);
        return;
      }

      setIsCheckingAttendance(true);
      try {
        const eventIds = Array.from(new Set(rowsWithEvent.map((r) => r.matchedEvent!.id)));
        const allSubmissions: Record<number, Submission[]> = {};

        for (const eventId of eventIds) {
          const response = await getSubmissions(eventId, getToken);
          if (response.success) {
            allSubmissions[eventId] = response.data;
          }
        }

        const verified: CsvRow[] = [];
        const needsVerification: CsvRow[] = [];

        rows.forEach((row) => {
          if (!row.matchedEvent) {
            verified.push(row);
            return;
          }

          const submissions = allSubmissions[row.matchedEvent.id] || [];
          const isFound = submissions.some((s) => {
            const sUniId = s.member.uni_id?.toString().trim().toLowerCase();
            const rUniId = row.uniId?.toString().trim().toLowerCase();

            if (sUniId && rUniId) return sUniId === rUniId;

            return (
              s.member.name.toLowerCase().trim() === row.name.toLowerCase().trim() ||
              s.member.email.toLowerCase().trim() === row.email.toLowerCase().trim()
            );
          });

          if (isFound) {
            verified.push(row);
          } else {
            needsVerification.push(row);
          }
        });

        setCsvRows(verified);
        if (needsVerification.length > 0) {
          setUnverifiedRows(needsVerification);
          setShowVerifyDialog(true);
        }
      } catch (err) {
        console.error("Verification failed:", err);
        toast.error(t("verificationFailed"));
        setCsvRows(rows);
      } finally {
        setIsCheckingAttendance(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getToken],
  );

  const parseCSV = React.useCallback(
    (text: string, customCols: boolean, customName: string, customEmail: string) => {
      try {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error(t("csvEmpty"));
          return;
        }

        const headers = lines[0]
          .toLowerCase()
          .split(",")
          .map((h) => h.trim().replace(/^"|"$/g, ""));

        let eventIdx = -1;
        let nameIdx = -1;
        let emailIdx = -1;
        let uniIdIdx = -1;

        if (customCols) {
          nameIdx = headers.findIndex((h) => h.includes(customName.toLowerCase().trim()));
          emailIdx = headers.findIndex((h) => h.includes(customEmail.toLowerCase().trim()));
          eventIdx = headers.findIndex((h) =>
            h.includes("event") ||
            h.includes("activity") ||
            h.includes("اسم الفاعلية") ||
            h.includes("الفعالية") ||
            h.includes("اسم النشاط") ||
            h === "النشاط" ||
            h === "المناسبة",
          );
        } else {
          eventIdx = headers.findIndex((h) =>
            h.includes("event") ||
            h.includes("activity") ||
            h.includes("اسم الفاعلية") ||
            h.includes("الفعالية") ||
            h.includes("اسم النشاط") ||
            h === "النشاط" ||
            h === "المناسبة",
          );
          nameIdx = headers.findIndex(
            (h, idx) =>
              idx !== eventIdx &&
              (h.includes("full name") ||
                h.includes("name") ||
                h.includes("الاسم كاملا") ||
                h.includes("الاسم الثلاثي") ||
                (h.includes("الاسم") && !h.includes("فعالية") && !h.includes("نشاط"))),
          );
          emailIdx = headers.findIndex((h) =>
            h.includes("email") ||
            h.includes("mail") ||
            h.includes("الايميل") ||
            h.includes("البريد") ||
            h.includes("البريد الإلكتروني"),
          );
          uniIdIdx = headers.findIndex((h) =>
            h.includes("uni id") ||
            h.includes("university id") ||
            h.includes("student id") ||
            h.includes("الرقم الجامعي") ||
            h.includes("رقم الطالب"),
          );
        }

        const genderIdx = headers.findIndex(
          (h) => h.includes("gender") || h.includes("النوع") || h.includes("الجنس"),
        );

        setHasEventColumn(eventIdx !== -1);

        if (nameIdx === -1 || emailIdx === -1) {
          toast.error(t("missingColumns"));
          return;
        }

        const parsedRows: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (!row || row.length < Math.max(nameIdx, emailIdx) + 1) continue;

          const cleanRow = row.map((cell) => cell.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));

          const eventName = eventIdx !== -1 ? cleanRow[eventIdx] || "" : "";
          const name = cleanRow[nameIdx] || "";
          const email = cleanRow[emailIdx] || "";
          const uniId = uniIdIdx !== -1 ? cleanRow[uniIdIdx] : undefined;
          let gender: "Male" | "Female" = (cleanRow[genderIdx] || "Male") as "Male" | "Female";

          const genderLower = gender.toLowerCase();
          if (genderLower.includes("f") || genderLower.includes("أنثى") || genderLower.includes("انثى")) {
            gender = "Female";
          } else {
            gender = "Male";
          }

          if (name && email) {
            const cleanedEventName = eventName.includes("|")
              ? eventName.split("|")[0].trim()
              : eventName.trim();

            const matchedEvent = cleanedEventName
              ? events.find((e) => e.name.toLowerCase().trim() === cleanedEventName.toLowerCase().trim())
              : undefined;

            parsedRows.push({ eventName: cleanedEventName, name, email, uniId, gender, matchedEvent, included: true });
          }
        }

        setCsvRows(parsedRows);
        if (eventIdx !== -1 && parsedRows.length > 0) {
          verifyAttendance(parsedRows);
        }
        toast.success(t("parsed", { count: parsedRows.length }));
      } catch (err) {
        toast.error(t("parseFailed"));
        console.error(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, verifyAttendance],
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text, useCustomColumns, customNameCol, customEmailCol);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAllowUnverified = (index: number) => {
    const row = unverifiedRows[index];
    setCsvRows((prev) => [row, ...prev]);
    setUnverifiedRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setShowVerifyDialog(false);
      return updated;
    });
  };

  const handleDenyUnverified = (index: number) => {
    const rowName = unverifiedRows[index].name;
    setUnverifiedRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setShowVerifyDialog(false);
      return updated;
    });
    toast.info(t("discarded", { name: rowName }));
  };

  const clearCsvRows = () => {
    setCsvRows([]);
    setFileName(null);
    setBatchSelectedEventId(null);
    setHasEventColumn(true);
    setUnverifiedRows([]);
    setShowVerifyDialog(false);
  };

  const clearCsv = () => {
    clearCsvRows();
    setJobResults([]);
    setFailedCount(0);
  };

  const handleSubmit = async () => {
    const includedRows = csvRows.filter((r) => r.included);
    if (includedRows.length === 0) {
      toast.error(t("noRecipientsSelected"));
      return;
    }

    if (!hasEventColumn && !batchSelectedEventId) {
      toast.error(t("selectEventForBatch"));
      return;
    }

    if (hasEventColumn) {
      const unmappedRows = includedRows.filter((r) => !r.matchedEvent);
      if (unmappedRows.length > 0) {
        toast.error(t("unmappedRows", { count: unmappedRows.length }));
        return;
      }
    }

    setIsSubmitting(true);
    setJobResults([]);
    setFailedCount(0);
    let ok = 0;
    let fail = 0;
    const results: { jobId: number | null | undefined; total: number }[] = [];

    const groups = new Map<number, typeof includedRows>();
    for (const row of includedRows) {
      const eid = hasEventColumn && row.matchedEvent ? row.matchedEvent.id : batchSelectedEventId!;
      if (!groups.has(eid)) groups.set(eid, []);
      groups.get(eid)!.push(row);
    }

    for (const [eventId, rows] of groups) {
      const payload: Parameters<typeof sendManualCertificate>[0] = {
        language: "en",
        event_id: eventId,
        provider,
        members: rows.map((r) => ({ member: { name: r.name, email: r.email, gender: r.gender } })),
      };

      const response = await sendManualCertificate(payload, getToken);
      if (response.success) {
        ok += rows.length;
        results.push({ jobId: response.data.job_id, total: response.data.recipient_count });
      } else {
        fail += rows.length;
        toast.error(response.error.message);
      }
    }

    setJobResults(results);
    setFailedCount(fail);

    if (ok > 0 && fail === 0) {
      toast.success(t("sentAll", { count: ok }));
      clearCsvRows();
    } else if (ok > 0) {
      toast.warning(t("sentPartial", { ok, fail }));
    }
    setIsSubmitting(false);
  };

  const dispatchButton = (
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting || csvRows.length === 0}
      variant="ochre"
    >
      {isSubmitting ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Send />}
      {t("dispatchAll")}
    </Button>
  );

  return (
    <div className="grid gap-4 md:grid-cols-12">
      <div className="min-w-0 md:col-span-4 space-y-4">
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-ink-2" />
                {t("columnSettings")}
              </CardTitle>
              <Switch checked={useCustomColumns} onCheckedChange={setUseCustomColumns} />
            </div>
            <CardDescription className="text-xs">
              {t("columnSettingsHint")}
            </CardDescription>
          </CardHeader>
          {useCustomColumns && (
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("nameColumnHeader")}</Label>
                <Input
                  value={customNameCol}
                  onChange={(e) => setCustomNameCol(e.target.value)}
                  autoComplete="off"
                  className="sm:h-8 md:text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("emailColumnHeader")}</Label>
                <Input
                  value={customEmailCol}
                  onChange={(e) => setCustomEmailCol(e.target.value)}
                  autoComplete="off"
                  className="sm:h-8 md:text-xs"
                />
              </div>
            </CardContent>
          )}
        </Card>

        <Card
          className={cn(
            " transition-colors",
            !hasEventColumn && csvRows.length > 0
              ? "ring-door-ochre/60"
              : "opacity-70",
          )}
        >
          <CardHeader className="p-4">
            <CardTitle
              className={cn(
                "text-base flex items-center gap-2",
                !hasEventColumn && csvRows.length > 0 ? "text-door-ochre-ink" : "",
              )}
            >
              {!hasEventColumn && csvRows.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4 text-ink-2" />
              )}
              {t("eventSelection")}
            </CardTitle>
            <CardDescription
              className={cn(
                "text-xs",
                !hasEventColumn && csvRows.length > 0
                  ? "text-door-ochre-ink/80"
                  : "text-muted-foreground",
              )}
            >
              {hasEventColumn && csvRows.length > 0
                ? t("eventsAutoAssigned")
                : t("selectEventHint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Popover open={batchComboboxOpen} onOpenChange={setBatchComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={hasEventColumn && csvRows.length > 0}
                  className="w-full justify-between h-10 px-3"
                >
                  {batchSelectedEvent ? (
                    <span dir="auto" className="truncate font-medium">{batchSelectedEvent.name}</span>
                  ) : (
                    <span className="text-muted-foreground">{t("selectEventPlaceholder")}</span>
                  )}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(300px,calc(100vw-2rem))] p-0" align="start">
                <Command filter={(value, search) => {
                  const normValue = normalizeArabic(value);
                  const normSearch = normalizeArabic(search);
                  if (!normSearch) return 1;
                  return normValue.includes(normSearch) ? 1 : 0;
                }}>
                  <CommandInput placeholder={t("searchEvents")} className="h-9" />
                  <CommandList>
                    <CommandEmpty>{t("noEventsFound")}</CommandEmpty>
                    <CommandGroup>
                      {events.map((event) => (
                        <CommandItem
                          key={event.id}
                          value={event.name}
                          onSelect={() => {
                            setBatchSelectedEventId(event.id);
                            setBatchComboboxOpen(false);
                          }}
                          className="text-sm px-3 py-2"
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4 text-primary",
                              batchSelectedEventId === event.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span dir="auto">{event.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatEventDate(event)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {batchSelectedEvent && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatEventDate(batchSelectedEvent)}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <Badge
                    variant={batchSelectedEvent.is_official ? "default" : "secondary"}
                    className="text-[11px] px-1.5 py-0 h-5"
                  >
                    {batchSelectedEvent.is_official ? tSend("official") : tSend("unofficial")}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 md:col-span-8 space-y-4 relative">
        {isCheckingAttendance && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300 rounded-xl border">
            <Loader2 className="text-ink-2 size-8 animate-spin motion-reduce:animate-none" />
            <p className="text-sm font-medium">{t("verifyingAttendance")}</p>
          </div>
        )}

        <Card className=" overflow-hidden py-0">
          <CardHeader className="p-4 border-b bg-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-ink-2" />
                  {t("batchImport")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {fileName ? (
                    <>
                      <span className="tabular font-bold text-foreground">
                        {csvRows.filter((r) => r.included).length}
                      </span>{" "}
                      {t("selectedOfTotal", { total: csvRows.length })}
                    </>
                  ) : (
                    t("uploadYourCsv")
                  )}
                </CardDescription>
              </div>
              {fileName && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCsvRows([
                        { name: "", email: "", eventName: "", gender: "Male", included: true },
                        ...csvRows,
                      ])
                    }
                    className="sm:h-8 sm:text-xs"
                  >
                    <Plus className="h-4 w-4" /> {t("addRow")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCsv}
                    className="text-destructive hover:bg-destructive/10 sm:h-8"
                  >
                    <Trash2 className="h-4 w-4" /> {t("clear")}
                  </Button>
                  <div className="hidden md:contents">{dispatchButton}</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t-0">
            {!fileName ? (
              <div
                role="button"
                tabIndex={0}
                className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer hover:bg-card active:bg-muted/40 transition-colors sm:py-16"
                onClick={() => document.getElementById("cert-csv-upload")?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById("cert-csv-upload")?.click();
                  }
                }}
              >
                <input
                  id="cert-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-sunk">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{t("uploadCsvFile")}</h3>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                  {t("uploadHint")}
                </p>
              </div>
            ) : (
              <>
              {/* Phone: one editable card per row - a four-column table of
                  inputs can't fit 360px. The table returns from md. */}
              <ul className="divide-y md:hidden">
                <li className="bg-muted/40 flex items-center gap-3 px-4 py-2">
                  <Checkbox
                    id="csv-select-all-phone"
                    className="size-5"
                    checked={csvRows.length > 0 && csvRows.every((r) => r.included)}
                    onCheckedChange={(checked) => {
                      setCsvRows((rows) => rows.map((r) => ({ ...r, included: !!checked })));
                    }}
                  />
                  <Label htmlFor="csv-select-all-phone" className="flex-1 py-2 text-sm">
                    {t("selectAll")}
                  </Label>
                </li>
                {csvRows.map((row, i) => (
                  <li key={i} className={cn("space-y-2 px-4 py-3", !row.included && "bg-sunk")}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        className="size-5"
                        checked={row.included}
                        aria-label={row.name || t("columnName")}
                        onCheckedChange={(checked) => {
                          setCsvRows((rows) => {
                            const newRows = [...rows];
                            newRows[i].included = !!checked;
                            return newRows;
                          });
                        }}
                      />
                      <div className={cn("min-w-0 flex-1", !row.included && "opacity-50")}>
                        {hasEventColumn ? (
                          <div className="flex min-w-0 items-center gap-2">
                            <span dir="auto" className="truncate text-[13px] font-medium">
                              {row.eventName || "\u2014"}
                            </span>
                            {row.matchedEvent ? (
                              <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-semibold ${SOFT.green}`}>
                                {t("matched")}
                              </span>
                            ) : row.eventName ? (
                              <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-semibold ${SOFT.ochre}`}>
                                {t("unmatched")}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground tabular text-xs">#{i + 1}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tc("remove")}
                        onClick={() => setCsvRows((rows) => rows.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-door-madder-ink shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className={cn("grid gap-2", !row.included && "opacity-50")}>
                      <Input
                        value={row.name}
                        dir="auto"
                        autoComplete="off"
                        aria-label={t("columnName")}
                        placeholder={tSend("fullNamePlaceholder")}
                        className="bg-background"
                        onChange={(e) =>
                          setCsvRows((rows) => {
                            const newRows = [...rows];
                            newRows[i].name = e.target.value;
                            return newRows;
                          })
                        }
                      />
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        value={row.email}
                        aria-label={t("columnEmail")}
                        placeholder={tDirect("emailPlaceholder")}
                        className="bg-background"
                        onChange={(e) =>
                          setCsvRows((rows) => {
                            const newRows = [...rows];
                            newRows[i].email = e.target.value;
                            return newRows;
                          })
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden h-[500px] overflow-auto md:block">
                <Table>
                  <TableHeader className="bg-sunk sticky top-0 z-10">
                    <TableRow className="h-10 hover:bg-transparent">
                      <TableHead className="w-12 text-center py-0">
                        <Checkbox
                          checked={csvRows.length > 0 && csvRows.every((r) => r.included)}
                          onCheckedChange={(checked) => {
                            setCsvRows((rows) => rows.map((r) => ({ ...r, included: !!checked })));
                          }}
                          aria-label={t("selectAll")}
                        />
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-0">{t("columnName")}</TableHead>
                      <TableHead className="text-xs font-semibold py-0">{t("columnEmail")}</TableHead>
                      {hasEventColumn && (
                        <TableHead className="text-xs font-semibold py-0">{t("columnEvent")}</TableHead>
                      )}
                      <TableHead className="w-12 py-0 text-center" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.map((row, i) => (
                      <TableRow key={i} className={cn("h-12", !row.included && "opacity-50 bg-sunk")}>
                        <TableCell className="w-12 text-center py-2">
                          <Checkbox
                            checked={row.included}
                            onCheckedChange={(checked) => {
                              setCsvRows((rows) => {
                                const newRows = [...rows];
                                newRows[i].included = !!checked;
                                return newRows;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            value={row.name}
                            placeholder={tSend("fullNamePlaceholder")}
                            className="h-8 md:text-xs bg-background md:max-w-[200px]"
                            onChange={(e) =>
                              setCsvRows((rows) => {
                                const newRows = [...rows];
                                newRows[i].name = e.target.value;
                                return newRows;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            value={row.email}
                            placeholder={tDirect("emailPlaceholder")}
                            className="h-8 md:text-xs bg-background md:max-w-[250px]"
                            onChange={(e) =>
                              setCsvRows((rows) => {
                                const newRows = [...rows];
                                newRows[i].email = e.target.value;
                                return newRows;
                              })
                            }
                          />
                        </TableCell>
                        {hasEventColumn && (
                          <TableCell className="py-2">
                            <div className="flex flex-col gap-0.5">
                              <div
                                className={cn(
                                  "text-xs font-medium truncate max-w-[150px]",
                                  row.matchedEvent
                                    ? "text-foreground"
                                    : "text-door-ochre-ink flex items-center gap-1",
                                )}
                              >
                                {!row.matchedEvent && <AlertCircle className="h-3 w-3" />}
                                {row.eventName || "\u2014"}
                              </div>
                              {row.matchedEvent ? (
                                <span className={`w-fit rounded-sm px-1.5 text-[10.5px] font-semibold ${SOFT.green}`}>
                                  {t("matched")}
                                </span>
                              ) : row.eventName ? (
                                <span className={`w-fit rounded-sm px-1.5 text-[10.5px] font-semibold ${SOFT.ochre}`}>
                                  {t("unmatched")}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="w-12 text-center py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCsvRows((rows) => rows.filter((_, idx) => idx !== i))}
                            className="h-6 w-6 text-muted-foreground hover:text-door-madder-ink"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>

        {fileName && <FormActions className="md:hidden">{dispatchButton}</FormActions>}

        {(jobResults.length > 0 || failedCount > 0) && !isSubmitting && (
          <div className="grid gap-4 sm:grid-cols-2">
            {jobResults.map((result, index) => (
              <EmailJobStatusCard
                key={result.jobId ?? index}
                jobId={result.jobId}
                getToken={getToken}
                itemKey="certificate"
                totalHint={result.total}
                onGoToLogs={onGoToLogs}
              />
            ))}
            {failedCount > 0 && (
              <Card className="gap-0 py-0 sm:gap-0 sm:py-0 ring-door-madder/30">
                <CardHeader className="p-4 sm:p-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-door-madder-ink">
                    <AlertCircle className="h-4 w-4" />
                    {t("failedToQueue", { count: failedCount })}
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>
        )}
      </div>

      <AttendanceVerifyDialog
        open={showVerifyDialog}
        onOpenChange={setShowVerifyDialog}
        unverifiedRows={unverifiedRows}
        onAllow={handleAllowUnverified}
        onDeny={handleDenyUnverified}
      />
    </div>
  );
}

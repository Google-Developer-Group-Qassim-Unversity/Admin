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
  Mail,
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
import type { Event, Submission } from "@/lib/api-types";

import type { CsvRow } from "./types";
import { AttendanceVerifyDialog } from "./attendance-verify-dialog";

interface CsvBatchPanelProps {
  events: Event[];
  onGoToLogs?: () => void;
}

function formatEventDate(event: Event): string {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start.toDateString() === end.toDateString()) return startStr;
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

export function CsvBatchPanel({ events, onGoToLogs }: CsvBatchPanelProps) {
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
  const [sentCount, setSentCount] = React.useState(0);
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
        toast.error("Attendance verification failed. Showing all rows.");
        setCsvRows(rows);
      } finally {
        setIsCheckingAttendance(false);
      }
    },
    [getToken],
  );

  const parseCSV = React.useCallback(
    (text: string, customCols: boolean, customName: string, customEmail: string) => {
      try {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error("CSV file is empty or invalid");
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
          toast.error("Required columns (Name, Email) not found in CSV. Try using custom columns.");
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
        toast.success(`Parsed ${parsedRows.length} members from CSV`);
      } catch (err) {
        toast.error("Failed to parse CSV file");
        console.error(err);
      }
    },
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
    toast.info(`Discarded: ${rowName}`);
  };

  const clearCsv = () => {
    setCsvRows([]);
    setFileName(null);
    setBatchSelectedEventId(null);
    setHasEventColumn(true);
    setSentCount(0);
    setFailedCount(0);
    setUnverifiedRows([]);
    setShowVerifyDialog(false);
  };

  const handleSubmit = async () => {
    const includedRows = csvRows.filter((r) => r.included);
    if (includedRows.length === 0) {
      toast.error("No recipients selected.");
      return;
    }

    if (!hasEventColumn && !batchSelectedEventId) {
      toast.error("Please select an event for this batch.");
      return;
    }

    if (hasEventColumn) {
      const unmappedRows = includedRows.filter((r) => !r.matchedEvent);
      if (unmappedRows.length > 0) {
        toast.error(
          `${unmappedRows.length} selected rows have no matching event. Fix or unselect them.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    setSentCount(0);
    setFailedCount(0);
    let ok = 0;
    let fail = 0;

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
        members: rows.map((r) => ({ member: { name: r.name, email: r.email, gender: r.gender } })),
      };

      const response = await sendManualCertificate(payload, getToken);
      if (response.success) {
        ok += rows.length;
      } else {
        fail += rows.length;
        toast.error(response.error.message);
      }
    }

    setSentCount(ok);
    setFailedCount(fail);

    if (ok > 0 && fail === 0) {
      toast.success(`Sent ${ok} certificate${ok !== 1 ? "s" : ""}!`);
      clearCsv();
    } else if (ok > 0) {
      toast.warning(`Sent ${ok}, ${fail} failed.`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="grid gap-4 md:grid-cols-12">
      <div className="md:col-span-4 space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Column Settings
              </CardTitle>
              <Switch checked={useCustomColumns} onCheckedChange={setUseCustomColumns} />
            </div>
            <CardDescription className="text-xs">
              Configure non-standard CSV headers before uploading.
            </CardDescription>
          </CardHeader>
          {useCustomColumns && (
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Name Column Header</Label>
                <Input
                  value={customNameCol}
                  onChange={(e) => setCustomNameCol(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email Column Header</Label>
                <Input
                  value={customEmailCol}
                  onChange={(e) => setCustomEmailCol(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          )}
        </Card>

        <Card
          className={cn(
            "shadow-sm transition-colors",
            !hasEventColumn && csvRows.length > 0
              ? "border-amber-200 dark:border-amber-900"
              : "opacity-70",
          )}
        >
          <CardHeader className="p-4">
            <CardTitle
              className={cn(
                "text-base flex items-center gap-2",
                !hasEventColumn && csvRows.length > 0 ? "text-amber-800 dark:text-amber-500" : "",
              )}
            >
              {!hasEventColumn && csvRows.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4 text-primary" />
              )}
              Event Selection
            </CardTitle>
            <CardDescription
              className={cn(
                "text-xs",
                !hasEventColumn && csvRows.length > 0
                  ? "text-amber-700/80 dark:text-amber-400/80"
                  : "text-muted-foreground",
              )}
            >
              {hasEventColumn && csvRows.length > 0
                ? "Events are assigned automatically from CSV columns."
                : "Select an event to assign to this batch."}
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
                    <span className="truncate font-medium">{batchSelectedEvent.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Select event for batch...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 shadow-lg" align="start">
                <Command>
                  <CommandInput placeholder="Search events..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No events found.</CommandEmpty>
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
                              "mr-2 h-4 w-4 text-primary",
                              batchSelectedEventId === event.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{event.name}</span>
                            <span className="text-[10px] text-muted-foreground">
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
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {batchSelectedEvent.is_official ? "Official" : "Unofficial"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-8 space-y-4 relative">
        {isCheckingAttendance && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300 rounded-xl border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Verifying attendance...</p>
          </div>
        )}

        <Card className="shadow-sm overflow-hidden py-0">
          <CardHeader className="p-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Batch Import (CSV)
                </CardTitle>
                <CardDescription className="text-xs">
                  {fileName ? (
                    <>
                      <span className="font-bold text-foreground">
                        {csvRows.filter((r) => r.included).length}
                      </span>{" "}
                      selected of {csvRows.length} recipients
                    </>
                  ) : (
                    "Upload your CSV file"
                  )}
                </CardDescription>
              </div>
              {fileName && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCsvRows([
                        { name: "", email: "", eventName: "", gender: "Male", included: true },
                        ...csvRows,
                      ])
                    }
                    className="h-8 text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Row
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCsv}
                    className="h-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Clear
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || csvRows.length === 0}
                    size="sm"
                    className="h-8 gap-2 shadow-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Dispatch All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t-0">
            {!fileName ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-6 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => document.getElementById("cert-csv-upload")?.click()}
              >
                <input
                  id="cert-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted shadow-inner">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Upload CSV File</h3>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                  Configure column headers on the left before uploading if your CSV uses non-standard headers.
                </p>
              </div>
            ) : (
              <div className="h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="h-10 hover:bg-transparent">
                      <TableHead className="w-12 text-center py-0">
                        <Checkbox
                          checked={csvRows.length > 0 && csvRows.every((r) => r.included)}
                          onCheckedChange={(checked) => {
                            setCsvRows((rows) => rows.map((r) => ({ ...r, included: !!checked })));
                          }}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-0">Name</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-0">Email</TableHead>
                      {hasEventColumn && (
                        <TableHead className="text-[10px] uppercase font-bold py-0">Event</TableHead>
                      )}
                      <TableHead className="w-12 py-0 text-center" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.map((row, i) => (
                      <TableRow key={i} className={cn("h-12", !row.included && "opacity-50 bg-muted/30")}>
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
                            placeholder="Full Name"
                            className="h-8 text-xs bg-background md:max-w-[200px]"
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
                            placeholder="email@example.com"
                            className="h-8 text-xs bg-background md:max-w-[250px]"
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
                                    : "text-amber-600 dark:text-amber-500 flex items-center gap-1",
                                )}
                              >
                                {!row.matchedEvent && <AlertCircle className="h-3 w-3" />}
                                {row.eventName || "\u2014"}
                              </div>
                              {row.matchedEvent ? (
                                <div className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-wider">
                                  Matched
                                </div>
                              ) : row.eventName ? (
                                <div className="text-[9px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">
                                  Unmatched
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="w-12 text-center py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCsvRows((rows) => rows.filter((_, idx) => idx !== i))}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {(sentCount > 0 || failedCount > 0) && !isSubmitting && (
          <div className="grid gap-4 sm:grid-cols-2">
            {sentCount > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Check className="h-4 w-4" />
                    Job started — {sentCount} certificate{sentCount !== 1 ? "s" : ""} queued
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground mb-3">
                    Certificates are being sent in the background. You can track progress in Email Logs.
                  </p>
                  {onGoToLogs && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={onGoToLogs}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      View Email Logs
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            {failedCount > 0 && (
              <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {failedCount} Failed
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

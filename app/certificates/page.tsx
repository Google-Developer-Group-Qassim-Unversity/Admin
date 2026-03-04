"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { Award, Plus, Trash2, Send, AlertCircle, Loader2, Check, ChevronsUpDown, Search, Upload, X, Users, FileSpreadsheet, Globe, Calendar, Settings2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { getCertificateEvents, sendManualCertificates, getMemberByUniId } from "@/lib/api";
import type { Event, CertificateMember, CertificateJobResponse } from "@/lib/api-types";

function formatEventDate(event: Event): string {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (start.toDateString() === end.toDateString()) {
    return startStr;
  }
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

interface CsvRow {
  eventName: string;
  name: string;
  email: string;
  gender: "Male" | "Female";
  matchedEvent?: Event;
  included: boolean;
}

export default function CertificatesPage() {
  const { getToken } = useAuth();

  const [events, setEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = React.useState<number | null>(null);
  const [comboboxOpen, setComboboxOpen] = React.useState(false);

  // Manual entry state
  const [manualMembers, setManualMembers] = React.useState<(CertificateMember & { uniId?: string; isLookingUp?: boolean })[]>([
    { name: "", email: "", gender: "Male", uniId: "" },
  ]);

  // CSV batch state
  const [csvRows, setCsvRows] = React.useState<CsvRow[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rawCsvText, setRawCsvText] = React.useState<string | null>(null);

  // Batch settings
  const [useCustomColumns, setUseCustomColumns] = React.useState(false);
  const [customNameCol, setCustomNameCol] = React.useState("name");
  const [customEmailCol, setCustomEmailCol] = React.useState("email");

  // Single Event Fallback
  const [hasEventColumn, setHasEventColumn] = React.useState(true);
  const [batchSelectedEventId, setBatchSelectedEventId] = React.useState<number | null>(null);
  const [batchComboboxOpen, setBatchComboboxOpen] = React.useState(false);
  const batchSelectedEvent = events.find((e) => e.id === batchSelectedEventId);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [jobResults, setJobResults] = React.useState<CertificateJobResponse[]>([]);

  React.useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      const response = await getCertificateEvents(getToken);
      if (response.success) {
        setEvents(response.data);
      } else {
        setError(response.error.message);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, [getToken]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Manual Member Handlers
  const handleManualMemberChange = (index: number, field: keyof CertificateMember | "uniId", value: string) => {
    const updated = [...manualMembers];
    updated[index] = { ...updated[index], [field]: value };
    setManualMembers(updated);
  };

  const handleLookup = async (index: number) => {
    const uniId = manualMembers[index].uniId;
    if (!uniId) return;

    const updated = [...manualMembers];
    updated[index].isLookingUp = true;
    setManualMembers(updated);

    const response = await getMemberByUniId(uniId, getToken);

    const finalUpdate = [...manualMembers];
    finalUpdate[index].isLookingUp = false;

    if (response.success) {
      const memberData = response.data;
      finalUpdate[index].name = memberData.name;
      finalUpdate[index].email = memberData.email;
      finalUpdate[index].gender = memberData.gender;
      toast.success(`Found: ${memberData.name}`);
    } else {
      toast.error("Member not found or lookup failed");
    }
    setManualMembers(finalUpdate);
  };

  const addManualMember = () => {
    setManualMembers([...manualMembers, { name: "", email: "", gender: "Male", uniId: "" }]);
  };

  const removeManualMember = (index: number) => {
    if (manualMembers.length > 1) {
      setManualMembers(manualMembers.filter((_, i) => i !== index));
    }
  };

  // CSV Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsvText(text);
      parseCSV(text, useCustomColumns, customNameCol, customEmailCol);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string, customCols: boolean = useCustomColumns, customName: string = customNameCol, customEmail: string = customEmailCol) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^"|"$/g, ''));

      let eventIdx = -1;
      let nameIdx = -1;
      let emailIdx = -1;

      if (customCols) {
        nameIdx = headers.findIndex(h => h.includes(customName.toLowerCase().trim()));
        emailIdx = headers.findIndex(h => h.includes(customEmail.toLowerCase().trim()));
        eventIdx = headers.findIndex(h =>
          h.includes("event") || h.includes("activity") ||
          h.includes("اسم الفاعلية") || h.includes("الفعالية") || h.includes("اسم النشاط") ||
          (h === "النشاط" || h === "المناسبة")
        );
      } else {
        eventIdx = headers.findIndex(h =>
          h.includes("event") || h.includes("activity") ||
          h.includes("اسم الفاعلية") || h.includes("الفعالية") || h.includes("اسم النشاط") ||
          (h === "النشاط" || h === "المناسبة")
        );

        nameIdx = headers.findIndex((h, idx) =>
          idx !== eventIdx && (
            h.includes("full name") || h.includes("name") ||
            h.includes("الاسم كاملا") || h.includes("الاسم الثلاثي") ||
            (h.includes("الاسم") && !h.includes("فعالية") && !h.includes("نشاط"))
          )
        );

        emailIdx = headers.findIndex(h =>
          h.includes("email") || h.includes("mail") ||
          h.includes("الايميل") || h.includes("البريد") || h.includes("البريد الإلكتروني")
        );
      }

      const genderIdx = headers.findIndex(h =>
        h.includes("gender") || h.includes("النوع") || h.includes("الجنس")
      );

      setHasEventColumn(eventIdx !== -1);

      if (nameIdx === -1 || emailIdx === -1) {
        toast.error("Required columns (Name, Email) not found in CSV. Try using custom columns.");
        console.log("Headers found:", headers);
        return;
      }

      const parsedRows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (!row || row.length < Math.max(nameIdx, emailIdx) + 1) continue;

        const cleanRow = row.map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const eventName = eventIdx !== -1 ? (cleanRow[eventIdx] || "") : "";
        const name = cleanRow[nameIdx] || "";
        const email = cleanRow[emailIdx] || "";
        let gender = (cleanRow[genderIdx] || "Male") as "Male" | "Female";

        const genderLower = gender.toLowerCase();
        if (genderLower.includes("f") || genderLower.includes("أنثى") || genderLower.includes("انثى")) {
          gender = "Female";
        } else {
          gender = "Male";
        }

        if (name && email) {
          const matchedEvent = eventName ? events.find(e => e.name.toLowerCase().trim() === eventName.toLowerCase().trim()) : undefined;
          parsedRows.push({ eventName, name, email, gender, matchedEvent, included: true });
        }
      }

      setCsvRows(parsedRows);
      toast.success(`Parsed ${parsedRows.length} members from CSV`);
    } catch (err) {
      toast.error("Failed to parse CSV file");
      console.error(err);
    }
  };

  const clearCsv = () => {
    setCsvRows([]);
    setFileName(null);
    setRawCsvText(null);
    setBatchSelectedEventId(null);
    setHasEventColumn(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEventId) {
      toast.error("Please select an event");
      return;
    }

    const validMembers = manualMembers.filter((m) => m.name.trim() && m.email.trim());
    if (validMembers.length === 0) {
      toast.error("No valid recipients to send to");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const member of validMembers) {
      if (!emailRegex.test(member.email)) {
        toast.error(`Invalid email: ${member.email}`);
        return;
      }
    }

    setIsSubmitting(true);
    setJobResults([]);

    const response = await sendManualCertificates(
      selectedEventId,
      validMembers.map(({ name, email, gender }) => ({ name, email, gender })),
      getToken
    );

    if (response.success) {
      toast.success("Certificate generation job started!");
      setJobResults([response.data]);
      setManualMembers([{ name: "", email: "", gender: "Male", uniId: "" }]);
    } else {
      toast.error(response.error.message);
    }

    setIsSubmitting(false);
  };

  const handleCsvSubmit = async () => {
    const includedRows = csvRows.filter(r => r.included);
    if (includedRows.length === 0) {
      toast.error("No recipients selected to receive certificates.");
      return;
    }

    // Group by matchedEvent ID or batchSelectedEventId
    const groups: Record<number, CertificateMember[]> = {};

    if (!hasEventColumn) {
      if (!batchSelectedEventId) {
        toast.error("Please select an event for this batch.");
        return;
      }
      groups[batchSelectedEventId] = includedRows.map(r => ({ name: r.name, email: r.email, gender: r.gender }));
    } else {
      const unmappedRows = includedRows.filter(r => !r.matchedEvent);

      if (unmappedRows.length > 0) {
        toast.error(`${unmappedRows.length} selected rows have no matching event name. Please fix before sending or unselect them.`);
        return;
      }

      includedRows.forEach(row => {
        if (row.matchedEvent) {
          if (!groups[row.matchedEvent.id]) groups[row.matchedEvent.id] = [];
          groups[row.matchedEvent.id].push({ name: row.name, email: row.email, gender: row.gender });
        }
      });
    }

    setIsSubmitting(true);
    setJobResults([]);
    const results: CertificateJobResponse[] = [];
    let hasError = false;

    for (const [eventIdStr, members] of Object.entries(groups)) {
      const eventId = parseInt(eventIdStr);
      const response = await sendManualCertificates(eventId, members, getToken);
      if (response.success) {
        results.push(response.data);
      } else {
        toast.error(`Error sending for event ${eventId}: ${response.error.message}`);
        hasError = true;
      }
    }

    setJobResults(results);
    if (!hasError) {
      toast.success(`Successfully queued certificates for ${results.length} events!`);
      clearCsv();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Certification Center</h1>
            <p className="text-sm text-muted-foreground">Manage and dispatch event certificates</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Events</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Batch (CSV)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-12">
                {/* Event Selection */}
                <Card className="md:col-span-4 bg-card border-border shadow-sm">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Step 1: Select Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-10 border-input bg-background px-3 hover:bg-accent text-sm"
                        >
                          {selectedEvent ? (
                            <span className="truncate font-medium">{selectedEvent.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Search event...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 shadow-lg border-border" align="start">
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
                                    setSelectedEventId(event.id);
                                    setComboboxOpen(false);
                                  }}
                                  className="text-sm px-3 py-2"
                                >
                                  <Check className={cn("mr-2 h-4 w-4 text-primary", selectedEventId === event.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span>{event.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatEventDate(event)}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedEvent && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatEventDate(selectedEvent)}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <Badge variant={selectedEvent.is_official ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                            {selectedEvent.is_official ? "Official" : "Regular"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recipients */}
                <Card className="md:col-span-8 bg-card border-border shadow-sm">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Step 2: Add Recipients
                      </div>
                      <Button variant="ghost" size="sm" onClick={addManualMember} className="h-8 text-xs gap-1">
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {manualMembers.map((member, index) => (
                        <div key={index} className="relative grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-lg border border-input bg-muted/30">
                          {manualMembers.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeManualMember(index)}
                              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background border border-border shadow-sm hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          <div className="md:col-span-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Lookup UNI ID</Label>
                            <div className="flex gap-1">
                              <Input
                                value={member.uniId}
                                onChange={(e) => handleManualMemberChange(index, "uniId", e.target.value)}
                                placeholder="ID..."
                                className="h-8 text-xs bg-background"
                              />
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => handleLookup(index)}
                                disabled={member.isLookingUp || !member.uniId}
                                className="h-8 w-8 shrink-0"
                              >
                                {member.isLookingUp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Name</Label>
                            <Input
                              value={member.name}
                              onChange={(e) => handleManualMemberChange(index, "name", e.target.value)}
                              placeholder="Full Name"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Email</Label>
                            <Input
                              value={member.email}
                              onChange={(e) => handleManualMemberChange(index, "email", e.target.value)}
                              placeholder="email@example.com"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Gender</Label>
                            <Select
                              value={member.gender}
                              onValueChange={(v) => handleManualMemberChange(index, "gender", v as "Male" | "Female")}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 border-t border-border flex justify-end">
                    <Button
                      onClick={handleManualSubmit}
                      disabled={isSubmitting || !selectedEventId}
                      className="h-9 gap-2 shadow-sm"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Certificates
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="batch" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-12">
                {/* Left Side: Initial Config & Fallback Event */}
                <div className="md:col-span-4 space-y-4">

                  {/* Custom Columns Config */}
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings2 className="h-4 w-4 text-primary" />
                          Column Settings
                        </CardTitle>
                        <Switch id="custom-cols" checked={useCustomColumns} onCheckedChange={setUseCustomColumns} />
                      </div>
                      <CardDescription className="text-xs">
                        Configure non-standard CSV headers before uploading.
                      </CardDescription>
                    </CardHeader>
                    {useCustomColumns && (
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Name Column Header</Label>
                          <Input value={customNameCol} onChange={(e) => setCustomNameCol(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email Column Header</Label>
                          <Input value={customEmailCol} onChange={(e) => setCustomEmailCol(e.target.value)} className="h-8 text-xs" />
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Fallback Event Selector */}
                  <Card className={cn("bg-card shadow-sm transition-colors", !hasEventColumn && csvRows.length > 0 ? "border-amber-200 dark:border-amber-900" : "border-border opacity-70")}>
                    <CardHeader className="p-4">
                      <CardTitle className={cn("text-base flex items-center gap-2", !hasEventColumn && csvRows.length > 0 ? "text-amber-800 dark:text-amber-500" : "")}>
                        {!hasEventColumn && csvRows.length > 0 ? <AlertCircle className="h-4 w-4" /> : <Calendar className="h-4 w-4 text-primary" />}
                        Event Selection
                      </CardTitle>
                      <CardDescription className={cn("text-xs", !hasEventColumn && csvRows.length > 0 ? "text-amber-700/80 dark:text-amber-400/80" : "text-muted-foreground")}>
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
                            className="w-full justify-between h-10 border-input bg-background px-3 hover:bg-accent text-sm"
                          >
                            {batchSelectedEvent ? (
                              <span className="truncate font-medium">{batchSelectedEvent.name}</span>
                            ) : (
                              <span className="text-muted-foreground">Select event for batch...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 shadow-lg border-border" align="start">
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
                                    <Check className={cn("mr-2 h-4 w-4 text-primary", batchSelectedEventId === event.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>{event.name}</span>
                                      <span className="text-[10px] text-muted-foreground">{formatEventDate(event)}</span>
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
                            <Badge variant={batchSelectedEvent.is_official ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                              {batchSelectedEvent.is_official ? "Official" : "Regular"}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side: CSV Table and actions */}
                <div className="md:col-span-8 space-y-4">
                  <Card className="bg-card border-border shadow-sm overflow-hidden py-0">
                    <CardHeader className="p-4 border-b border-border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            Batch Import (CSV)
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {fileName
                              ? <><span className="font-bold text-foreground">{csvRows.filter(r => r.included).length}</span> selected of {csvRows.length} recipients</>
                              : "Upload your CSV file"}
                          </CardDescription>
                        </div>
                        {fileName && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCsvRows([{ name: "", email: "", eventName: "", gender: "Male", included: true }, ...csvRows])} className="h-8 text-xs">
                              <Plus className="h-4 w-4 mr-1" /> Add Row
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearCsv} className="h-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4 mr-2" /> Clear
                            </Button>
                            <Button
                              onClick={handleCsvSubmit}
                              disabled={isSubmitting || csvRows.length === 0}
                              size="sm"
                              className="h-8 gap-2 shadow-sm"
                            >
                              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Dispatch All
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 border-t-0">
                      {!fileName ? (
                        <div
                          className="flex flex-col items-center justify-center py-16 px-6 cursor-pointer border-b-0 border-x-0 border-t-0 hover:bg-muted/30 transition-colors"
                          onClick={() => document.getElementById("csv-upload")?.click()}
                        >
                          <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted shadow-inner">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold">Upload CSV File</h3>
                          <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                            Please select your column header configuration on the left before uploading the file.
                          </p>
                        </div>
                      ) : (
                        <div className="h-[500px] overflow-auto">
                          <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                              <TableRow className="h-10 hover:bg-transparent">
                                <TableHead className="w-12 text-center py-0">
                                  <Checkbox
                                    checked={csvRows.length > 0 && csvRows.every(r => r.included)}
                                    onCheckedChange={(checked) => {
                                      setCsvRows(rows => rows.map(r => ({ ...r, included: !!checked })));
                                    }}
                                    aria-label="Select all"
                                  />
                                </TableHead>
                                <TableHead className="text-[10px] uppercase font-bold py-0">Name</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold py-0">Email</TableHead>
                                <TableHead className="w-12 py-0 text-center"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvRows.map((row, i) => (
                                <TableRow key={i} className={cn("h-12", !row.included && "opacity-50 bg-muted/30")}>
                                  <TableCell className="w-12 text-center py-2">
                                    <Checkbox
                                      checked={row.included}
                                      onCheckedChange={(checked) => {
                                        setCsvRows(rows => {
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
                                      onChange={(e) => setCsvRows(rows => {
                                        const newRows = [...rows];
                                        newRows[i].name = e.target.value;
                                        return newRows;
                                      })}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input
                                      value={row.email}
                                      placeholder="email@example.com"
                                      className="h-8 text-xs bg-background md:max-w-[250px]"
                                      onChange={(e) => setCsvRows(rows => {
                                        const newRows = [...rows];
                                        newRows[i].email = e.target.value;
                                        return newRows;
                                      })}
                                    />
                                  </TableCell>
                                  <TableCell className="w-12 text-center py-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setCsvRows(rows => rows.filter((_, idx) => idx !== i))}
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
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Job Results */}
          {jobResults.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobResults.map((result) => (
                <Card key={result.job_id} className="relative overflow-hidden bg-muted/20 border-border animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="absolute top-0 right-0 p-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 h-5 text-[10px] uppercase font-bold tracking-tight">
                      {result.status}
                    </Badge>
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Job Registered
                    </CardTitle>
                    <CardDescription className="text-[11px] truncate">{result.event_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Reference ID</Label>
                      <p className="font-mono text-[11px] bg-background border border-border rounded px-1.5 py-0.5">{result.job_id}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Storage</Label>
                      <p className="text-[11px] text-foreground font-medium truncate">{result.folder_name}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

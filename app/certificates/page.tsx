"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { Award, Plus, Trash2, Send, AlertCircle, Loader2, Check, ChevronsUpDown, Search, Upload, X, Users, FileSpreadsheet, Globe, Calendar } from "lucide-react";
import { toast } from "sonner";

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
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^"|"$/g, ''));

      // Improved header matching for Arabic and English
      const eventIdx = headers.findIndex(h =>
        h.includes("event") || h.includes("activity") ||
        h.includes("اسم الفاعلية") || h.includes("الفعالية") || h.includes("اسم النشاط") ||
        (h === "النشاط" || h === "المناسبة")
      );

      const nameIdx = headers.findIndex((h, idx) =>
        idx !== eventIdx && (
          h.includes("full name") || h.includes("name") ||
          h.includes("الاسم كاملا") || h.includes("الاسم الثلاثي") ||
          (h.includes("الاسم") && !h.includes("فعالية") && !h.includes("نشاط"))
        )
      );

      const emailIdx = headers.findIndex(h =>
        h.includes("email") || h.includes("mail") ||
        h.includes("الايميل") || h.includes("البريد") || h.includes("البريد الإلكتروني")
      );

      const genderIdx = headers.findIndex(h =>
        h.includes("gender") || h.includes("النوع") || h.includes("الجنس")
      );

      if (eventIdx === -1 || nameIdx === -1 || emailIdx === -1) {
        toast.error("Required columns (Event Name, Name, Email) not found in CSV");
        console.log("Headers found:", headers);
        return;
      }

      const parsedRows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        // More robust CSV split regex to handle quotes and empty fields
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (!row || row.length < Math.max(eventIdx, nameIdx, emailIdx) + 1) continue;

        const cleanRow = row.map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const eventName = cleanRow[eventIdx] || "";
        const name = cleanRow[nameIdx] || "";
        const email = cleanRow[emailIdx] || "";
        let gender = (cleanRow[genderIdx] || "Male") as "Male" | "Female";

        const genderLower = gender.toLowerCase();
        if (genderLower.includes("f") || genderLower.includes("أنثى") || genderLower.includes("انثى")) {
          gender = "Female";
        } else {
          gender = "Male";
        }

        if (eventName && name && email) {
          const matchedEvent = events.find(e => e.name.toLowerCase().trim() === eventName.toLowerCase().trim());
          parsedRows.push({ eventName, name, email, gender, matchedEvent });
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
    if (csvRows.length === 0) return;

    // Group by matchedEvent ID
    const groups: Record<number, CertificateMember[]> = {};
    const unmappedRows = csvRows.filter(r => !r.matchedEvent);

    if (unmappedRows.length > 0) {
      toast.error(`${unmappedRows.length} rows have no matching event name. Please fix before sending.`);
      return;
    }

    csvRows.forEach(row => {
      if (row.matchedEvent) {
        if (!groups[row.matchedEvent.id]) groups[row.matchedEvent.id] = [];
        groups[row.matchedEvent.id].push({ name: row.name, email: row.email, gender: row.gender });
      }
    });

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
              <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Batch Import (Google Forms CSV)</CardTitle>
                      <CardDescription className="text-xs">Match certificates to events automatically by name</CardDescription>
                    </div>
                    {fileName && (
                      <Button variant="ghost" size="sm" onClick={clearCsv} className="h-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" /> Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {!fileName ? (
                    <div
                      className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer border-b-0 border-x-0 border-t-0 hover:bg-muted/30 transition-colors"
                      onClick={() => document.getElementById("csv-upload")?.click()}
                    >
                      <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted shadow-inner">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold">Upload CSV File</h3>
                      <p className="text-xs text-muted-foreground mt-1">Accepts CSV with columns for Event Name, Name, and Email</p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow className="h-10 hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase font-bold py-0">Event Info</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold py-0">Name</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold py-0">Email</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold py-0">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvRows.map((row, i) => (
                            <TableRow key={i} className="h-12">
                              <TableCell className="py-2">
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs truncate max-w-[200px]">{row.eventName}</span>
                                  {row.matchedEvent ? (
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-muted-foreground">
                                        {formatEventDate(row.matchedEvent)}
                                      </span>
                                      <span className={cn(
                                        "text-[9px] px-1 rounded border",
                                        row.matchedEvent.is_official ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                                      )}>
                                        {row.matchedEvent.is_official ? "Official" : "Regular"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-destructive flex items-center gap-1">
                                      <AlertCircle className="h-2.5 w-2.5" /> No match found
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs py-2">{row.name}</TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">{row.email}</TableCell>
                              <TableCell className="py-2">
                                <Badge variant="outline" className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  row.gender === "Male" ? "border-blue-200 text-blue-600 bg-blue-50/50" : "border-pink-200 text-pink-600 bg-pink-50/50"
                                )}>
                                  {row.gender}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
                {fileName && (
                  <CardFooter className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Total <span className="font-bold text-foreground">{csvRows.length}</span> recipients
                    </p>
                    <Button
                      onClick={handleCsvSubmit}
                      disabled={isSubmitting || csvRows.length === 0}
                      className="h-9 gap-2 shadow-sm"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Dispatch All Certificates
                    </Button>
                  </CardFooter>
                )}
              </Card>
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

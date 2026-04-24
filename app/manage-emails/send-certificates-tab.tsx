"use client";

import * as React from "react";
import {
  Users,
  FileSpreadsheet,
  Calendar,
  Send,
  Loader2,
  Plus,
  X,
  UserPlus,
  Check,
  ChevronsUpDown,
  Award,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { getCertificateEvents, sendManualCertificate } from "@/lib/api";
import type { Event, Member, CertificateLanguage } from "@/lib/api-types";

import type { RecipientRow, EventFormData } from "./types";
import { MemberSearchDialog } from "./member-search-dialog";
import { CsvBatchPanel } from "./csv-batch-panel";

function formatEventDate(event: Event): string {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (start.toDateString() === end.toDateString()) return startStr;
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

function toDateString(datetime: string): string {
  return new Date(datetime).toISOString().split("T")[0];
}

export function SendCertificatesTab() {
  const { getToken } = useAuth();

  const [events, setEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const [eventForm, setEventForm] = React.useState<EventFormData>({
    name: "",
    date: "",
    official: false,
  });

  const [recipients, setRecipients] = React.useState<RecipientRow[]>([
    { name: "", email: "", gender: "Male" },
  ]);

  const [language, setLanguage] = React.useState<CertificateLanguage>("ar");
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sentCount, setSentCount] = React.useState(0);
  const [failedCount, setFailedCount] = React.useState(0);

  const selectedEvent = eventForm.event_id
    ? events.find((e) => e.id === eventForm.event_id)
    : null;

  const validRecipientCount = recipients.filter((r) => r.name.trim() && r.email.trim()).length;
  const isEventValid = eventForm.name.trim() && eventForm.date.trim();

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

  const handleSelectEvent = (event: Event) => {
    setEventForm({
      event_id: event.id,
      name: event.name,
      date: toDateString(event.start_datetime),
      official: event.is_official,
    });
    setComboboxOpen(false);
  };

  const handleEventFieldChange = (field: keyof EventFormData, value: string | boolean) => {
    setEventForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field !== "event_id") {
        updated.event_id = undefined;
      }
      return updated;
    });
  };

  const handleRecipientChange = (index: number, field: keyof RecipientRow, value: string) => {
    setRecipients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "name" || field === "email") {
        updated[index].member_id = undefined;
      }
      return updated;
    });
  };

  const addRecipient = () => {
    setRecipients((prev) => [...prev, { name: "", email: "", gender: "Male" }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleMembersPicked = (members: Member[]) => {
    setRecipients((prev) => [
      ...prev,
      ...members.map((m) => ({
        name: m.name,
        email: m.email,
        gender: m.gender as "Male" | "Female",
        member_id: m.id,
      })),
    ]);
    toast.success(`Added ${members.length} member${members.length !== 1 ? "s" : ""}`);
  };

  const handleSend = async () => {
    if (!isEventValid) {
      toast.error("Please fill in event details");
      return;
    }

    const validRecipients = recipients.filter((r) => r.name.trim() && r.email.trim());
    if (validRecipients.length === 0) {
      toast.error("No valid recipients to send to");
      return;
    }

    setIsSubmitting(true);
    let ok = 0;
    let fail = 0;

    for (const recipient of validRecipients) {
      const payload: Parameters<typeof sendManualCertificate>[0] = {
        language,
      };

      if (eventForm.event_id) {
        payload.event_id = eventForm.event_id;
      } else {
        payload.event = {
          name: eventForm.name,
          date: eventForm.date,
          official: eventForm.official,
        };
      }

      if (recipient.member_id) {
        payload.member_id = recipient.member_id;
      } else {
        payload.member = {
          name: recipient.name,
          email: recipient.email,
          gender: recipient.gender,
        };
      }

      const response = await sendManualCertificate(payload, getToken);
      if (response.success) {
        ok++;
      } else {
        fail++;
        toast.error(`Failed for ${recipient.name}: ${response.error.message}`);
      }
    }

    setSentCount(ok);
    setFailedCount(fail);

    if (ok > 0) {
      toast.success(`Sent ${ok} certificate${ok !== 1 ? "s" : ""} successfully!`);
      setRecipients([{ name: "", email: "", gender: "Male" }]);
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Events</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Batch (CSV)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-12">
            <Card className="md:col-span-4 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Event
                </CardTitle>
                <CardDescription className="text-xs">
                  Select from existing events or fill in manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-9 px-3 text-sm"
                    >
                      {selectedEvent ? (
                        <span className="truncate">{selectedEvent.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Search &amp; select...</span>
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
                              onSelect={() => handleSelectEvent(event)}
                              className="text-sm px-3 py-2"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-primary",
                                  eventForm.event_id === event.id ? "opacity-100" : "opacity-0",
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

                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      Event Name
                    </Label>
                    <Input
                      value={eventForm.name}
                      onChange={(e) => handleEventFieldChange("name", e.target.value)}
                      placeholder="Enter event name"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => handleEventFieldChange("date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      Type
                    </Label>
                    <Select
                      value={eventForm.official ? "official" : "unofficial"}
                      onValueChange={(v) => handleEventFieldChange("official", v === "official")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="official">Official</SelectItem>
                        <SelectItem value="unofficial">Unofficial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      Language
                    </Label>
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage(v as CertificateLanguage)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-8 shadow-sm flex flex-col">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Recipients
                  {validRecipientCount > 0 && (
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {validRecipientCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in details manually or use &quot;Pick Members&quot; to search and auto-fill from existing members.
                </CardDescription>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMemberDialogOpen(true)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Pick Members
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRecipient}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {recipients.map((recipient, index) => (
                    <div
                      key={index}
                      className="relative grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      {recipients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRecipient(index)}
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background border shadow-sm hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="md:col-span-5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                          Name
                        </Label>
                        <Input
                          value={recipient.name}
                          onChange={(e) => handleRecipientChange(index, "name", e.target.value)}
                          placeholder="Full Name"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={recipient.email}
                          onChange={(e) => handleRecipientChange(index, "email", e.target.value)}
                          placeholder="email@example.com"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                          Gender
                        </Label>
                        <Select
                          value={recipient.gender}
                          onValueChange={(v) =>
                            handleRecipientChange(index, "gender", v as "Male" | "Female")
                          }
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
              <CardFooter className="p-4 border-t flex justify-end">
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isSubmitting || validRecipientCount === 0 || !isEventValid}
                  className="h-9 gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Certificates{validRecipientCount > 0 ? ` (${validRecipientCount})` : ""}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {(sentCount > 0 || failedCount > 0) && !isSubmitting && (
            <div className="grid gap-4 sm:grid-cols-2">
              {sentCount > 0 && (
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <Award className="h-4 w-4" />
                      {sentCount} Certificate{sentCount !== 1 ? "s" : ""} Sent
                    </CardTitle>
                  </CardHeader>
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
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <CsvBatchPanel events={events} />
        </TabsContent>
      </Tabs>

      <MemberSearchDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        onConfirm={handleMembersPicked}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { Award, Plus, Trash2, Send, AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { getCertificateEvents, sendManualCertificates } from "@/lib/api";
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

export default function CertificatesPage() {
  const { getToken } = useAuth();

  const [events, setEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = React.useState<number | null>(null);
  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const [members, setMembers] = React.useState<CertificateMember[]>([
    { name: "", email: "", gender: "Male" },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [jobResult, setJobResult] = React.useState<CertificateJobResponse | null>(null);

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

  const handleMemberChange = (index: number, field: keyof CertificateMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const addMember = () => {
    setMembers([...members, { name: "", email: "", gender: "Male" }]);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleEventSelect = (eventId: number) => {
    setSelectedEventId(eventId);
    setComboboxOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEventId) {
      toast.error("Please select an event");
      return;
    }

    const validMembers = members.filter((m) => m.name.trim() && m.email.trim());
    if (validMembers.length === 0) {
      toast.error("Please add at least one member with name and email");
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
    setJobResult(null);

    const response = await sendManualCertificates(
      selectedEventId,
      validMembers,
      getToken
    );

    if (response.success) {
      toast.success("Certificates sent successfully!");
      setJobResult(response.data);
    } else {
      toast.error(response.error.message);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex justify-center px-4 sm:px-0">
      <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Send Certificates</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Send certificates to custom recipients for an event
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Events</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  Certificate Details
                </CardTitle>
                <CardDescription className="text-sm">
                  Select an event and add recipients for the certificates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label>Event</Label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between h-auto min-h-9 py-2"
                      >
                        {selectedEvent ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-left">
                            <span className="font-medium">{selectedEvent.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatEventDate(selectedEvent)}
                            </span>
                            {!!selectedEvent.is_official && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                Official
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "Search events..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search events..." />
                        <CommandList>
                          <CommandEmpty>No events found.</CommandEmpty>
                          <CommandGroup>
                            {events.map((event) => (
                              <CommandItem
                                key={event.id}
                                value={event.name}
                                keywords={[event.name, formatEventDate(event)]}
                                onSelect={() => handleEventSelect(event.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedEventId === event.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  <span className="font-medium truncate">{event.name}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                                    {formatEventDate(event)}
                                    {!!event.is_official && (
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                        Official
                                      </Badge>
                                    )}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm sm:text-base">Recipients</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addMember}>
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {members.map((member, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-2 p-3 border rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor={`name-${index}`} className="text-xs">
                            Name
                          </Label>
                          <Input
                            id={`name-${index}`}
                            value={member.name}
                            onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                            placeholder="Full name"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`email-${index}`} className="text-xs">
                            Email
                          </Label>
                          <Input
                            id={`email-${index}`}
                            type="email"
                            value={member.email}
                            onChange={(e) => handleMemberChange(index, "email", e.target.value)}
                            placeholder="email@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`gender-${index}`} className="text-xs">
                            Gender
                          </Label>
                          <Select
                            value={member.gender}
                            onValueChange={(v) => handleMemberChange(index, "gender", v as "Male" | "Female")}
                          >
                            <SelectTrigger id={`gender-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(index)}
                            disabled={members.length === 1}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSubmitting || !selectedEventId} className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Certificates
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {jobResult && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Certificate Job Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Job ID:</strong> {jobResult.job_id}</p>
                <p><strong>Event:</strong> {jobResult.event_name}</p>
                <p><strong>Folder:</strong> {jobResult.folder_name}</p>
                <p><strong>Status:</strong> {jobResult.status}</p>
                <p><strong>Message:</strong> {jobResult.message}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

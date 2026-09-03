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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { getCertificateEvents, sendManualCertificate } from "@/lib/api";
import type { Event, Member, CertificateLanguage, EmailProvider } from "@/lib/api-types";

import type { RecipientRow, EventFormData } from "./types";
import { MemberSearchDialog } from "./member-search-dialog";
import { CsvBatchPanel } from "./csv-batch-panel";
import { ProviderSelect } from "./provider-select";
import { EmailJobStatusCard } from "@/components/email-job-status-card";
import { useTranslations } from "next-intl";

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

export function SendCertificatesTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const t = useTranslations("manageEmails.sendCertificates");
  const tf = useTranslations("common.fields");
  const tDirect = useTranslations("manageEmails.directEmail");
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
  const [provider, setProvider] = React.useState<EmailProvider>("google");
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sentResult, setSentResult] = React.useState<{ jobId: number | null | undefined; total: number } | null>(
    null
  );

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
    toast.success(t("addedMembers", { count: members.length }));
  };

  const handleSend = async () => {
    if (!isEventValid) {
      toast.error(t("fillEventDetails"));
      return;
    }

    const validRecipients = recipients.filter((r) => r.name.trim() && r.email.trim());
    if (validRecipients.length === 0) {
      toast.error(t("noValidRecipients"));
      return;
    }

    setIsSubmitting(true);

    const payload: Parameters<typeof sendManualCertificate>[0] = {
      language,
      provider,
      members: validRecipients.map((r) =>
        r.member_id
          ? { member_id: r.member_id }
          : { member: { name: r.name, email: r.email, gender: r.gender } }
      ),
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

    const response = await sendManualCertificate(payload, getToken);
    if (response.success) {
      toast.success(response.data.message);
      setSentResult({ jobId: response.data.job_id, total: response.data.recipient_count });
      setRecipients([{ name: "", email: "", gender: "Male" }]);
    } else {
      toast.error(response.error.message);
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
        <AlertTitle>{t("errorLoadingEvents")}</AlertTitle>
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
            {t("individual")}
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {t("batchCsv")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-12">
            <Card className="md:col-span-4 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {t("event")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("eventHint")}
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
                        <span className="text-muted-foreground">{t("searchAndSelect")}</span>
                      )}
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 shadow-lg" align="start">
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
                              onSelect={() => handleSelectEvent(event)}
                              className="text-sm px-3 py-2"
                            >
                              <Check
                                className={cn(
                                  "me-2 h-4 w-4 text-primary",
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
                      {t("eventName")}
                    </Label>
                    <Input
                      value={eventForm.name}
                      onChange={(e) => handleEventFieldChange("name", e.target.value)}
                      placeholder={t("eventNamePlaceholder")}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      {tf("date")}
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
                      {t("type")}
                    </Label>
                    <Select
                      value={eventForm.official ? "official" : "unofficial"}
                      onValueChange={(v) => handleEventFieldChange("official", v === "official")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="official">{t("official")}</SelectItem>
                        <SelectItem value="unofficial">{t("unofficial")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      {t("language")}
                    </Label>
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage(v as CertificateLanguage)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t("english")}</SelectItem>
                        <SelectItem value="ar">{t("arabic")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ProviderSelect value={provider} onChange={setProvider} disabled={isSubmitting} />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-8 shadow-sm flex flex-col">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {t("recipients")}
                  {validRecipientCount > 0 && (
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {validRecipientCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("recipientsHint")}
                </CardDescription>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMemberDialogOpen(true)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> {tDirect("pickMembers")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRecipient}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("addRow")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pe-2">
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
                          className="absolute -end-2 -top-2 h-6 w-6 rounded-full bg-background border shadow-sm hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="md:col-span-5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                          {tf("name")}
                        </Label>
                        <Input
                          value={recipient.name}
                          onChange={(e) => handleRecipientChange(index, "name", e.target.value)}
                          placeholder={t("fullNamePlaceholder")}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                          {tf("email")}
                        </Label>
                        <Input
                          type="email"
                          value={recipient.email}
                          onChange={(e) => handleRecipientChange(index, "email", e.target.value)}
                          placeholder={tDirect("emailPlaceholder")}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                          {tf("gender")}
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
                            <SelectItem value="Male">{tf("male")}</SelectItem>
                            <SelectItem value="Female">{tf("female")}</SelectItem>
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
                  {t("sendCertificatesButton", { count: validRecipientCount })}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {sentResult && !isSubmitting && (
            <EmailJobStatusCard
              jobId={sentResult.jobId}
              getToken={getToken}
              itemKey="certificate"
              totalHint={sentResult.total}
              onGoToLogs={onGoToLogs}
            />
          )}
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <CsvBatchPanel events={events} onGoToLogs={onGoToLogs} provider={provider} />
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

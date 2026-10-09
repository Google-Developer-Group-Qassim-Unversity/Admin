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
import { FormActions } from "@/components/form-actions";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/format";

/** "9 Oct 2026", or a range written the way the reader's language writes ranges. */
function formatEventDate(event: Event, fmt: ReturnType<typeof useFormatters>): string {
  return fmt.range(event.start_datetime, event.end_datetime);
}

function toDateString(datetime: string): string {
  return new Date(datetime).toISOString().split("T")[0];
}

export function SendCertificatesTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const t = useTranslations("manageEmails.sendCertificates");
  const fmt = useFormatters();
  const tf = useTranslations("common.fields");
  const tDirect = useTranslations("manageEmails.directEmail");
  const tc = useTranslations("common.actions");
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

  const sendButton = (
    <Button
      type="button"
      onClick={handleSend}
      disabled={isSubmitting || validRecipientCount === 0 || !isEventValid}
      variant="ochre"
      size="lg"
    >
      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}
      {t("sendCertificatesButton", { count: validRecipientCount })}
    </Button>
  );

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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("errorLoadingEvents")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:max-w-[400px]">
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
            <Card className="md:col-span-4">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-ink-2" />
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
                      className="w-full justify-between px-3 text-sm"
                    >
                      {selectedEvent ? (
                        <span dir="auto" className="truncate">{selectedEvent.name}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("searchAndSelect")}</span>
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
                                <span dir="auto">{event.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatEventDate(event, fmt)}
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
                    <Label className="text-ink-2 text-xs font-bold mb-1 block">
                      {t("eventName")}
                    </Label>
                    <Input
                      value={eventForm.name}
                      dir="auto"
                      onChange={(e) => handleEventFieldChange("name", e.target.value)}
                      placeholder={t("eventNamePlaceholder")}
                      className="sm:h-8 md:text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-ink-2 text-xs font-bold mb-1 block">
                      {tf("date")}
                    </Label>
                    <Input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => handleEventFieldChange("date", e.target.value)}
                      className="sm:h-8 md:text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-ink-2 text-xs font-bold mb-1 block">
                      {t("type")}
                    </Label>
                    <Select
                      value={eventForm.official ? "official" : "unofficial"}
                      onValueChange={(v) => handleEventFieldChange("official", v === "official")}
                    >
                      <SelectTrigger className="w-full sm:h-8 md:text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="official">{t("official")}</SelectItem>
                        <SelectItem value="unofficial">{t("unofficial")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-ink-2 text-xs font-bold mb-1 block">
                      {t("language")}
                    </Label>
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage(v as CertificateLanguage)}
                    >
                      <SelectTrigger className="w-full sm:h-8 md:text-xs">
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

            <Card className="md:col-span-8 flex flex-col">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-ink-2" />
                  {t("recipients")}
                  {validRecipientCount > 0 && (
                    <Badge variant="secondary" className="tabular">
                      {validRecipientCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("recipientsHint")}
                </CardDescription>
                <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMemberDialogOpen(true)}
                    className="gap-1.5 sm:h-7 sm:text-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> {tDirect("pickMembers")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRecipient}
                    className="gap-1.5 sm:h-7 sm:text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("addRow")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <div className="space-y-3 pt-2 md:max-h-[400px] md:overflow-y-auto md:pe-2">
                  {recipients.map((recipient, index) => (
                    <div
                      key={index}
                      className="relative grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-lg bg-sunk ring-1 ring-rule"
                    >
                      {recipients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRecipient(index)}
                          aria-label={tc("remove")}
                          className="absolute -end-2 -top-2 size-8 rounded-sm bg-card ring-1 ring-rule hover:text-door-madder-ink md:size-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="md:col-span-5">
                        <Label className="text-ink-2 text-xs font-bold mb-1 block">
                          {tf("name")}
                        </Label>
                        <Input
                          value={recipient.name}
                          dir="auto"
                          autoComplete="off"
                          onChange={(e) => handleRecipientChange(index, "name", e.target.value)}
                          placeholder={t("fullNamePlaceholder")}
                          className="sm:h-8 md:text-xs bg-background"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Label className="text-ink-2 text-xs font-bold mb-1 block">
                          {tf("email")}
                        </Label>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="off"
                          value={recipient.email}
                          onChange={(e) => handleRecipientChange(index, "email", e.target.value)}
                          placeholder={tDirect("emailPlaceholder")}
                          className="sm:h-8 md:text-xs bg-background"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-ink-2 text-xs font-bold mb-1 block">
                          {tf("gender")}
                        </Label>
                        <Select
                          value={recipient.gender}
                          onValueChange={(v) =>
                            handleRecipientChange(index, "gender", v as "Male" | "Female")
                          }
                        >
                          <SelectTrigger className="sm:h-8 md:text-xs bg-background">
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
              <CardFooter className="hidden p-4 border-t md:flex justify-end">{sendButton}</CardFooter>
            </Card>
          </div>

          {/* Phone: the send button sticks above the tab bar instead of
              sitting at the foot of the recipients card. */}
          <FormActions className="md:hidden">{sendButton}</FormActions>

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

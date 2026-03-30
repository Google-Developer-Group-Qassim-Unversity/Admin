"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.793.372-.273.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.505 0 .16 5.335.157 11.877c0 2.09.547 4.133 1.588 5.927L.057 24l6.305-1.654a11.88 11.88 0 005.684 1.448h.005c6.544 0 11.89-5.335 11.893-11.878a11.787 11.787 0 00-3.48-8.383z"/>
    </svg>
  );
}

interface Recipient {
  name: string;
  email: string;
}

interface EventData {
  name: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
}

interface SendAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  onSubmit: (subject: string, htmlContent: string) => Promise<void>;
  isLoading?: boolean;
  event?: EventData;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function parseDatetime(datetime: string): Date {
  return new Date(datetime.replace(' ', 'T'));
}

function getArabicDayNames(start: Date, end: Date): string {
  const startDay = start.getDay();
  const endDay = end.getDay();
  if (startDay === endDay) {
    return ARABIC_DAYS[startDay];
  }
  return `${ARABIC_DAYS[startDay]} - ${ARABIC_DAYS[endDay]}`;
}

function formatArabicDate(start: Date, end: Date): string {
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startMonth === endMonth && startYear === endYear) {
    if (startDay === endDay) {
      return `${startDay} ${ARABIC_MONTHS[startMonth]} ${startYear}`;
    }
    return `${startDay} - ${endDay} ${ARABIC_MONTHS[startMonth]} ${startYear}`;
  }
  
  return `${startDay} ${ARABIC_MONTHS[startMonth]} ${startYear} - ${endDay} ${ARABIC_MONTHS[endMonth]} ${endYear}`;
}

function formatArabicTime(start: Date, end: Date): string {
  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    let period: string;
    
    if (hours === 12) {
      period = 'ظهراً';
    } else if (hours === 0 || hours === 24) {
      hours = 12;
      period = 'صباحاً';
    } else if (hours < 12) {
      period = 'صباحاً';
    } else if (hours === 12) {
      period = 'ظهراً';
    } else if (hours >= 18) {
      hours -= 12;
      period = 'مساءً';
    } else {
      hours -= 12;
      period = 'مساءً';
    }
    
    if (hours === 0) hours = 12;
    
    if (minutes > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return `${hours} ${period}`;
  };
  
  return `${formatTime(start)} حتى ${formatTime(end)}`;
}

function extractTemplateParts(html: string): { styleContent: string; bodyContent: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const styleContent = styleMatch ? styleMatch[1] : '';
  
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  
  return { styleContent, bodyContent };
}

function buildEmailHtml(styleContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styleContent}</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Roboto, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, 'Noto Sans Arabic', sans-serif; color: #111827;" dir="rtl">
${bodyContent}
</body>
</html>`;
}

function replacePlaceholders(html: string, event: EventData): string {
  const start = parseDatetime(event.start_datetime);
  const end = parseDatetime(event.end_datetime);
  
  const replacements: Record<string, string> = {
    eventName: event.name,
    days: getArabicDayNames(start, end),
    date: formatArabicDate(start, end),
    time: formatArabicTime(start, end),
    location: event.location,
  };
  
  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value);
  }
  
  return result;
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((el) => el.remove());
  doc
    .querySelectorAll("[onclick], [onerror], [onload], [onmouseover]")
    .forEach((el) => {
      el.removeAttribute("onclick");
      el.removeAttribute("onerror");
      el.removeAttribute("onload");
      el.removeAttribute("onmouseover");
    });
  return doc.documentElement.outerHTML;
}

export function SendAcceptanceDialog({
  open,
  onOpenChange,
  recipients,
  onSubmit,
  isLoading = false,
  event,
}: SendAcceptanceDialogProps) {
  const [subject, setSubject] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateStyles, setTemplateStyles] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const prevEventRef = useRef<EventData | undefined>(undefined);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch("/acceptance-template.html");
        if (!res.ok) throw new Error("Failed to load template");
        let html = await res.text();
        if (event) {
          html = replacePlaceholders(html, event);
        }
        const { styleContent, bodyContent } = extractTemplateParts(html);
        setTemplateStyles(styleContent);
        setTemplateBody(bodyContent);
        setTemplateLoaded(true);
        setTemplateError(null);
      } catch (err) {
        setTemplateError(
          err instanceof Error ? err.message : "Failed to load template",
        );
      }
    }

    const eventChanged = event !== prevEventRef.current;
    prevEventRef.current = event;

    if (open && (!templateLoaded || eventChanged)) {
      loadTemplate();
    }
  }, [open, templateLoaded, event]);

  useEffect(() => {
    if (open && event?.name) {
      setSubject(`قبول ${event.name}`);
    }
  }, [open, event]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (isLoading && !newOpen) return;
      if (!newOpen) {
        setSubject("");
        setWhatsappUrl("");
        setTemplateBody("");
        setTemplateStyles("");
        setTemplateLoaded(false);
        setRecipientsOpen(false);
        setDialogKey((prev) => prev + 1);
      }
      onOpenChange(newOpen);
    },
    [isLoading, onOpenChange],
  );

  const handleSubmit = async () => {
    if (!subject.trim()) return;
    if (!iframeRef.current?.contentDocument?.body) return;

    let bodyContent = iframeRef.current.contentDocument.body.innerHTML;
    if (whatsappUrl.trim()) {
      bodyContent = bodyContent.replace(/\{\{whatsappUrl\}\}/gi, whatsappUrl.trim());
    }
    
    const emailHtml = buildEmailHtml(templateStyles, bodyContent);
    const cleanHtml = sanitizeHtml(emailHtml);

    await onSubmit(subject.trim(), cleanHtml);
  };

  const recipientCount = recipients.length;
  const isSubmitDisabled = !subject.trim() || isLoading || recipientCount === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        key={dialogKey}
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Send Acceptance Emails</DialogTitle>
          <DialogDescription>
            Send acceptance emails to {recipientCount} recipient
            {recipientCount !== 1 ? "s" : ""}. Edit the email template below
            before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Collapsible open={recipientsOpen} onOpenChange={setRecipientsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
              >
                <span>Recipients ({recipientCount})</span>
                {recipientsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-lg border max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-left py-2 px-3 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((recipient, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">{recipient.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {recipient.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Content</Label>
            {templateError ? (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                {templateError}
              </div>
            ) : (
              <div className="flex justify-center">
                <iframe
                  ref={iframeRef}
                  srcDoc={`
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                      <meta charset="UTF-8">
                      <link rel="preload" as="image" href="https://gdg-q.com/gdg.png" />
                      <style>${templateStyles}</style>
                      <style>
                        body { padding: 10px; min-height: 100%; direction: rtl; margin: 0; background-color: #f1f5f9; }
                      </style>
                    </head>
                    <body contenteditable="true" style="background-color:#f1f5f9;margin:0">${templateBody}</body>
                    </html>`
                  }
                  className="border rounded-md"
                  style={{
                    width: "375px",
                    height: "667px",
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappUrl">WhatsApp Group Link</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600">
                <WhatsAppIcon className="h-5 w-5" />
              </div>
              <Input
                id="whatsappUrl"
                placeholder="https://chat.whatsapp.com/..."
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

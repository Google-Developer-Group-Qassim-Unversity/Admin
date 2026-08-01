"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  UserPlus,
  Plus,
  X,
  Upload,
  Send,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload";

import { uploadEmailAttachment } from "@/lib/api";
import type { Member, ManualCertificateMember, EmailAttachmentInfo } from "@/lib/api-types";
import { useSendCustomEmail, useSendCustomEmailTest } from "@/hooks/use-custom-email";
import { MemberSearchDialog } from "@/app/manage-emails/member-search-dialog";
import type { RecipientRow } from "@/app/manage-emails/types";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 5;

const BLANK_ROW: RecipientRow = { name: "", email: "", gender: "Male" };

function extractTemplateParts(html: string): { styleContent: string; bodyContent: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const styleContent = styleMatch ? styleMatch[1] : "";
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

function isValidRow(row: RecipientRow): boolean {
  return Boolean(row.member_id) || Boolean(row.name.trim() && row.email.trim());
}

function toMembersPayload(rows: RecipientRow[]): ManualCertificateMember[] {
  return rows
    .filter(isValidRow)
    .map((r) =>
      r.member_id
        ? { member_id: r.member_id }
        : { member: { name: r.name, email: r.email, gender: r.gender } }
    );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface RecipientRowsEditorProps {
  recipients: RecipientRow[];
  onChange: (recipients: RecipientRow[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

function RecipientRowsEditor({ recipients, onChange, disabled, compact }: RecipientRowsEditorProps) {
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);

  const handleRowChange = (index: number, field: keyof RecipientRow, value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "name" || field === "email") {
      updated[index].member_id = undefined;
    }
    onChange(updated);
  };

  const addRow = () => onChange([...recipients, { ...BLANK_ROW }]);

  const removeRow = (index: number) => {
    if (recipients.length > 1) onChange(recipients.filter((_, i) => i !== index));
  };

  const handleMembersPicked = (members: Member[]) => {
    onChange([
      ...recipients,
      ...members.map((m) => ({
        name: m.name,
        email: m.email,
        gender: m.gender as "Male" | "Female",
        member_id: m.id,
      })),
    ]);
    toast.success(`Added ${members.length} member${members.length !== 1 ? "s" : ""}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMemberDialogOpen(true)}
          disabled={disabled}
          className="h-7 text-xs gap-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" /> Pick Members
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled}
          className="h-7 text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Row
        </Button>
      </div>
      <div className={cn("space-y-2 overflow-y-auto pr-1", compact ? "max-h-40" : "max-h-56")}>
        {recipients.map((recipient, index) => (
          <div
            key={index}
            className="relative grid grid-cols-1 md:grid-cols-12 gap-2 p-2 rounded-lg border bg-muted/30"
          >
            {recipients.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-background border shadow-sm hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <div className="md:col-span-5">
              <Input
                value={recipient.name}
                onChange={(e) => handleRowChange(index, "name", e.target.value)}
                placeholder="Full Name"
                disabled={disabled}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="md:col-span-4">
              <Input
                type="email"
                value={recipient.email}
                onChange={(e) => handleRowChange(index, "email", e.target.value)}
                placeholder="email@example.com"
                disabled={disabled}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="md:col-span-3">
              <Select
                value={recipient.gender}
                onValueChange={(v) => handleRowChange(index, "gender", v as "Male" | "Female")}
                disabled={disabled}
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
      <MemberSearchDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        onConfirm={handleMembersPicked}
      />
    </div>
  );
}

interface AttachmentEntry {
  file: File;
  status: "uploading" | "done" | "error";
  info?: EmailAttachmentInfo;
}

interface SendCustomEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  getToken: () => Promise<string | null>;
  /** The event's eligible/not-yet-sent members. Read-only here — use Test Mode to send to anyone else. */
  recipients: RecipientRow[];
}

export function SendCustomEmailDialog({
  open,
  onOpenChange,
  eventId,
  getToken,
  recipients,
}: SendCustomEmailDialogProps) {
  const [subject, setSubject] = React.useState("");
  const [testRecipients, setTestRecipients] = React.useState<RecipientRow[]>([{ ...BLANK_ROW }]);
  const [attachmentEntries, setAttachmentEntries] = React.useState<AttachmentEntry[]>([]);
  const [testSectionOpen, setTestSectionOpen] = React.useState(false);
  const [dialogKey, setDialogKey] = React.useState(0);
  const [templateBody, setTemplateBody] = React.useState("");
  const [templateStyles, setTemplateStyles] = React.useState("");
  const [templateLoaded, setTemplateLoaded] = React.useState(false);
  const [templateError, setTemplateError] = React.useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const sendMutation = useSendCustomEmail(getToken);
  const testMutation = useSendCustomEmailTest(getToken);

  const isBusy = sendMutation.isPending || testMutation.isPending;

  React.useEffect(() => {
    if (open) {
      setSubject("شهادة حضور [Event Name]");
    }
  }, [open]);

  React.useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch("/custom-email-template.html");
        if (!res.ok) throw new Error("Failed to load template");
        const html = await res.text();
        const { styleContent, bodyContent } = extractTemplateParts(html);
        setTemplateStyles(styleContent);
        setTemplateBody(bodyContent);
        setTemplateLoaded(true);
        setTemplateError(null);
      } catch (err) {
        setTemplateError(err instanceof Error ? err.message : "Failed to load template");
      }
    }

    if (open && !templateLoaded) {
      loadTemplate();
    }
  }, [open, templateLoaded]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isBusy && !newOpen) return;
    if (!newOpen) {
      setSubject("");
      setTestRecipients([{ ...BLANK_ROW }]);
      setAttachmentEntries([]);
      setTestSectionOpen(false);
      setTemplateLoaded(false);
      setTemplateBody("");
      setTemplateStyles("");
      setDialogKey((k) => k + 1);
    }
    onOpenChange(newOpen);
  };

  const handleFilesAccepted = async (newFiles: File[]) => {
    setAttachmentEntries((prev) => [
      ...prev,
      ...newFiles.map((file) => ({ file, status: "uploading" as const })),
    ]);

    for (const file of newFiles) {
      const result = await uploadEmailAttachment(file, getToken);
      setAttachmentEntries((prev) =>
        prev.map((entry) =>
          entry.file === file
            ? result.success
              ? { ...entry, status: "done" as const, info: result.data }
              : { ...entry, status: "error" as const }
            : entry
        )
      );
      if (!result.success) {
        toast.error(`Failed to upload ${file.name}: ${result.error.message}`);
      }
    }
  };

  const handleRemoveFile = (file: File) => {
    setAttachmentEntries((prev) => prev.filter((entry) => entry.file !== file));
  };

  const files = attachmentEntries.map((entry) => entry.file);
  const readyAttachments = attachmentEntries
    .filter((entry): entry is AttachmentEntry & { info: EmailAttachmentInfo } => entry.status === "done" && !!entry.info)
    .map((entry) => entry.info);
  const isUploadingAttachments = attachmentEntries.some((entry) => entry.status === "uploading");
  const totalAttachmentSize = readyAttachments.reduce((sum, a) => sum + (a.size ?? 0), 0);
  const attachmentSizeExceeded = totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE;

  const validRecipients = recipients.filter(isValidRow);
  const validTestRecipients = testRecipients.filter(isValidRow);

  const isSubmitDisabled =
    !subject.trim() ||
    isBusy ||
    validRecipients.length === 0 ||
    isUploadingAttachments ||
    attachmentSizeExceeded;

  const isTestDisabled =
    !subject.trim() ||
    isBusy ||
    validTestRecipients.length === 0 ||
    isUploadingAttachments ||
    attachmentSizeExceeded;

  const handleSubmit = async () => {
    if (!iframeRef.current?.contentDocument?.body) return;
    const bodyContent = iframeRef.current.contentDocument.body.innerHTML;
    const htmlContent = sanitizeHtml(buildEmailHtml(templateStyles, bodyContent));

    try {
      const data = await sendMutation.mutateAsync({
        eventId,
        payload: {
          subject: subject.trim(),
          html_content: htmlContent,
          members: toMembersPayload(recipients),
          attachments: readyAttachments,
          language: "ar",
        },
      });
      toast.success(data.message);
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send custom email");
    }
  };

  const handleTestSubmit = async () => {
    if (!iframeRef.current?.contentDocument?.body) return;
    const bodyContent = iframeRef.current.contentDocument.body.innerHTML;
    const htmlContent = sanitizeHtml(buildEmailHtml(templateStyles, bodyContent));

    try {
      const data = await testMutation.mutateAsync({
        eventId,
        payload: {
          subject: subject.trim(),
          html_content: htmlContent,
          test_recipients: toMembersPayload(testRecipients),
          attachments: readyAttachments,
          language: "ar",
        },
      });
      toast.success(`Sent test email to ${data.sent_count} recipient${data.sent_count !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={dialogKey} className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Custom Email</DialogTitle>
          <DialogDescription>
            Compose a personalized email for hand-picked recipients. Use{" "}
            <code className="text-xs">[Name]</code> and <code className="text-xs">[Event Name]</code>{" "}
            in the subject or body to personalize each recipient&apos;s email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="flex-shrink-0">
            <div className="space-y-2">
              <Label>Email Body</Label>
              {templateError ? (
                <div className="p-4 border rounded-md bg-destructive/10 text-destructive">{templateError}</div>
              ) : (
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
                    <body contenteditable="true" dir="rtl" style="background-color:#f1f5f9;margin:0">${templateBody}</body>
                    </html>`
                  }
                  className="border rounded-md"
                  style={{ width: "375px", height: "667px" }}
                />
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="custom-email-subject">Subject</Label>
            <Input
              id="custom-email-subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <div className="space-y-2">
            <Label>Recipients ({recipients.length})</Label>
            <div className="rounded-lg border max-h-48 overflow-y-auto divide-y">
              {recipients.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No eligible recipients.</div>
              ) : (
                recipients.map((r, index) => (
                  <div key={r.member_id ?? index} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              These are the event&apos;s eligible, not-yet-sent members and can&apos;t be edited here — use Test Mode
              below to preview with different people.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Extra Attachments</Label>
            <p className="text-xs text-muted-foreground">
              The certificate is always attached automatically. Add extra files here (optional) — e.g. a flyer or ID
              card.
            </p>
            <FileUpload
              multiple
              maxFiles={MAX_ATTACHMENT_FILES}
              maxSize={MAX_ATTACHMENT_FILE_SIZE}
              accept="image/*,application/pdf"
              value={files}
              onAccept={handleFilesAccepted}
              onFileReject={(_file, message) => toast.error(message)}
              disabled={isBusy}
            >
              <FileUploadDropzone className="min-h-20 flex-col">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Drag &amp; drop images or PDFs, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Up to {MAX_ATTACHMENT_FILES} files, {formatSize(MAX_ATTACHMENT_FILE_SIZE)} each
                </p>
              </FileUploadDropzone>
              <FileUploadList>
                {attachmentEntries.map((entry) => (
                  <FileUploadItem key={`${entry.file.name}-${entry.file.lastModified}`} value={entry.file}>
                    <FileUploadItemPreview />
                    <FileUploadItemMetadata />
                    {entry.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <FileUploadItemDelete asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFile(entry.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </FileUploadItemDelete>
                  </FileUploadItem>
                ))}
              </FileUploadList>
            </FileUpload>
            {attachmentSizeExceeded && (
              <p className="text-xs text-destructive">
                Total attachment size ({formatSize(totalAttachmentSize)}) exceeds the{" "}
                {formatSize(MAX_TOTAL_ATTACHMENT_SIZE)} limit. Remove a file to continue.
              </p>
            )}
          </div>

          <Collapsible open={testSectionOpen} onOpenChange={setTestSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                <span>Test Mode</span>
                {testSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Send a personalized preview to these recipients without logging it as a real send.
              </p>
              <RecipientRowsEditor
                recipients={testRecipients}
                onChange={setTestRecipients}
                disabled={isBusy}
                compact
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestSubmit}
                disabled={isTestDisabled}
                className="w-full"
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test ({validTestRecipients.length})
                  </>
                )}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isBusy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send ({validRecipients.length} recipient{validRecipients.length !== 1 ? "s" : ""})
                </>
              )}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

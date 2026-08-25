"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Mail, UserPlus, X, Upload, Send, Paperclip, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import type { DirectEmailResponse, EmailAttachmentInfo, EmailProvider, Member } from "@/lib/api-types";
import { useSendDirectEmail } from "@/hooks/use-direct-email";
import { MemberSearchDialog } from "./member-search-dialog";
import { ProviderSelect } from "./provider-select";
import {
  DEFAULT_BODY,
  DEFAULT_STYLES,
  buildEmailHtml,
  extractTemplateParts,
  sanitizeHtml,
  formatSize,
} from "./email-composer-utils";

const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 5;

interface AttachmentEntry {
  file: File;
  status: "uploading" | "done" | "error";
  info?: EmailAttachmentInfo;
}

interface RecipientEntry {
  name: string;
  email: string;
  member_id?: number;
}

export function DirectEmailTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const { getToken } = useAuth();

  const [subject, setSubject] = React.useState("");
  const [provider, setProvider] = React.useState<EmailProvider>("google");
  const [bodyContent, setBodyContent] = React.useState(DEFAULT_BODY);
  const [composerKey, setComposerKey] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<"rendered" | "raw">("rendered");
  const [rawHtml, setRawHtml] = React.useState("");
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const [recipients, setRecipients] = React.useState<RecipientEntry[]>([]);
  const [manualName, setManualName] = React.useState("");
  const [manualEmail, setManualEmail] = React.useState("");
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);

  const [attachmentEntries, setAttachmentEntries] = React.useState<AttachmentEntry[]>([]);

  const [sentResult, setSentResult] = React.useState<DirectEmailResponse | null>(null);

  const sendMutation = useSendDirectEmail(getToken);
  const isBusy = sendMutation.isPending;

  const getCurrentHtml = (): string | null => {
    if (viewMode === "raw") {
      return rawHtml.trim() ? sanitizeHtml(rawHtml) : null;
    }
    if (!iframeRef.current?.contentDocument?.body) return null;
    const bodyContent = iframeRef.current.contentDocument.body.innerHTML;
    return sanitizeHtml(buildEmailHtml(DEFAULT_STYLES, bodyContent));
  };

  const handleViewModeChange = (mode: "rendered" | "raw") => {
    if (mode === viewMode) return;
    if (mode === "raw") {
      const html = getCurrentHtml();
      setRawHtml(html ?? "");
    } else {
      // Body content survives the round-trip; any <style> the user typed in raw mode does not
      // (this composer only edits body content, not styles) -- acceptable for a basic tool, but
      // real edits to the body itself must never be silently dropped switching back.
      const { bodyContent: extracted } = extractTemplateParts(rawHtml);
      setBodyContent(extracted);
      setComposerKey((k) => k + 1);
    }
    setViewMode(mode);
  };

  const handleMembersPicked = (members: Member[]) => {
    setRecipients((prev) => {
      const existing = new Set(prev.map((r) => r.email.toLowerCase()));
      const additions = members
        .filter((m) => !existing.has(m.email.toLowerCase()))
        .map((m) => ({ name: m.name, email: m.email, member_id: m.id }));
      return [...prev, ...additions];
    });
    toast.success(`Added ${members.length} member${members.length !== 1 ? "s" : ""}`);
  };

  const handleAddManualRecipient = () => {
    const email = manualEmail.trim();
    if (!email) return;
    if (recipients.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      toast.error("That email is already in the list");
      return;
    }
    setRecipients((prev) => [...prev, { name: manualName.trim() || email, email }]);
    setManualName("");
    setManualEmail("");
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
  };

  const handleFilesAccepted = async (newFiles: File[]) => {
    setAttachmentEntries((prev) => [...prev, ...newFiles.map((file) => ({ file, status: "uploading" as const }))]);

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

  const isSendDisabled =
    !subject.trim() || recipients.length === 0 || isBusy || isUploadingAttachments || attachmentSizeExceeded;

  const handleSend = async () => {
    const html = getCurrentHtml();
    if (!html || recipients.length === 0) return;
    try {
      const data = await sendMutation.mutateAsync({
        subject: subject.trim(),
        html_content: html,
        recipients: recipients.map((r) =>
          r.member_id ? { member_id: r.member_id } : { email: r.email, name: r.name }
        ),
        attachments: readyAttachments,
        provider,
      });
      setSentResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Recipients {recipients.length > 0 && `(${recipients.length})`}
          </CardTitle>
          <CardDescription className="text-xs">
            Pick one or more members, or add emails directly. Each recipient gets their own individual send.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Name (optional)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              disabled={isBusy}
              className="h-9"
            />
            <Input
              type="email"
              placeholder="email@example.com"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              disabled={isBusy}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleAddManualRecipient}
              disabled={isBusy || !manualEmail.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setMemberDialogOpen(true)}
            disabled={isBusy}
          >
            <UserPlus className="h-3.5 w-3.5" /> Pick Members
          </Button>
          {recipients.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
              {recipients.map((r) => (
                <div key={r.email} className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={() => removeRecipient(r.email)}
                    disabled={isBusy}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Compose
          </CardTitle>
          <CardDescription className="text-xs">Edit the email body directly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <Label>Email Content</Label>
                <div className="inline-flex rounded-md border p-0.5">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("rendered")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-sm transition-colors",
                      viewMode === "rendered"
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Rendered
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("raw")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-sm transition-colors",
                      viewMode === "raw"
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Raw HTML
                  </button>
                </div>
              </div>
              <div
                className="border rounded-md overflow-auto"
                style={{ width: "375px", height: "500px", minWidth: "280px", maxWidth: "100%", resize: "horizontal" }}
              >
                {viewMode === "raw" ? (
                  <textarea
                    value={rawHtml}
                    onChange={(e) => setRawHtml(e.target.value)}
                    spellCheck={false}
                    placeholder="<html>...</html>"
                    className="resize-none border-0 rounded-none font-mono text-xs h-full w-full p-3 outline-none"
                  />
                ) : (
                  <iframe
                    key={composerKey}
                    ref={iframeRef}
                    srcDoc={`
                      <!DOCTYPE html>
                      <html dir="rtl" lang="ar">
                      <head>
                        <meta charset="UTF-8">
                        <style>${DEFAULT_STYLES}</style>
                        <style>
                          body { padding: 10px; min-height: 100%; direction: rtl; margin: 0; background-color: #f1f5f9; }
                        </style>
                      </head>
                      <body contenteditable="true" dir="rtl" style="background-color:#f1f5f9;margin:0">${bodyContent}</body>
                      </html>`}
                    className="border-0 h-full w-full"
                  />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="direct-subject">Subject</Label>
                <Input
                  id="direct-subject"
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isBusy}
                />
              </div>
              <ProviderSelect value={provider} onChange={setProvider} disabled={isBusy} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            Attachments
          </CardTitle>
          <CardDescription className="text-xs">Optional files included with this email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
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
              <p className="mt-1 text-xs text-muted-foreground">Drag &amp; drop images or PDFs, or click to browse</p>
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
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveFile(entry.file)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </FileUploadItemDelete>
                </FileUploadItem>
              ))}
            </FileUploadList>
          </FileUpload>
          {attachmentSizeExceeded && (
            <p className="text-xs text-destructive">
              Total attachment size ({formatSize(totalAttachmentSize)}) exceeds the {formatSize(MAX_TOTAL_ATTACHMENT_SIZE)}{" "}
              limit. Remove a file to continue.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSend} disabled={isSendDisabled} className="h-9 gap-2 shadow-sm">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send{recipients.length > 0 ? ` (${recipients.length})` : ""}
        </Button>
      </div>

      {sentResult && (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Users className="h-4 w-4" />
              Job started — {sentResult.recipient_count} recipient{sentResult.recipient_count !== 1 ? "s" : ""} queued
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              Sending in the background, one email per recipient — a log entry will appear in Email Logs for each
              once it completes.
            </p>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              View Email Logs
            </Button>
          </CardContent>
        </Card>
      )}

      <MemberSearchDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} onConfirm={handleMembersPicked} />
    </div>
  );
}

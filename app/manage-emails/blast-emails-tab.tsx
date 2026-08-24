"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
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
  Save,
  Trash2,
  Users,
  SlidersHorizontal,
  Paperclip,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";
import type { BlastOrderBy, BlastSendResponse, EmailAttachmentInfo, EmailTemplate, Member } from "@/lib/api-types";
import {
  useBlastEligibleCount,
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplates,
  useSendBlastEmail,
  useSendBlastEmailTest,
  useUpdateEmailTemplate,
} from "@/hooks/use-blast-email";
import { MemberSearchDialog } from "./member-search-dialog";
import {
  DEFAULT_BODY,
  DEFAULT_STYLES,
  buildEmailHtml,
  extractTemplateParts,
  formatSize,
  sanitizeHtml,
} from "./email-composer-utils";

const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 5;

interface GuaranteedRecipient {
  name: string;
  email: string;
  member_id?: number;
}

interface AttachmentEntry {
  file: File;
  status: "uploading" | "done" | "error";
  info?: EmailAttachmentInfo;
}

const ORDER_LABELS: Record<BlastOrderBy, string> = {
  activity: "most recently active",
  alphabetical: "alphabetical order",
};

export function BlastEmailsTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const { getToken } = useAuth();

  const [subject, setSubject] = React.useState("");
  const [previewText, setPreviewText] = React.useState("");
  const [templateBody, setTemplateBody] = React.useState(DEFAULT_BODY);
  const [templateStyles, setTemplateStyles] = React.useState(DEFAULT_STYLES);
  const [composerKey, setComposerKey] = React.useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<"rendered" | "raw">("rendered");
  const [rawHtml, setRawHtml] = React.useState("");
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = React.useState(false);
  const [templateNameDraft, setTemplateNameDraft] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<EmailTemplate | null>(null);

  const [count, setCount] = React.useState(0);
  const [orderBy, setOrderBy] = React.useState<BlastOrderBy>("activity");
  const [guaranteed, setGuaranteed] = React.useState<GuaranteedRecipient[]>([]);
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualEmail, setManualEmail] = React.useState("");

  const [attachmentEntries, setAttachmentEntries] = React.useState<AttachmentEntry[]>([]);

  const [testSectionOpen, setTestSectionOpen] = React.useState(false);
  const [testEmails, setTestEmails] = React.useState("");

  const [sentResult, setSentResult] = React.useState<BlastSendResponse | null>(null);

  const eligibleCountQuery = useBlastEligibleCount(getToken);
  const templatesQuery = useEmailTemplates(getToken);
  const createTemplateMutation = useCreateEmailTemplate(getToken);
  const updateTemplateMutation = useUpdateEmailTemplate(getToken);
  const deleteTemplateMutation = useDeleteEmailTemplate(getToken);
  const sendMutation = useSendBlastEmail(getToken);
  const testMutation = useSendBlastEmailTest(getToken);

  const eligibleCount = eligibleCountQuery.data?.eligible_count ?? 0;
  const templates = templatesQuery.data ?? [];
  const isBusy = sendMutation.isPending || testMutation.isPending;

  const sliderMax = Math.max(eligibleCount, 1);
  const recipientCap = eligibleCount;
  const clampCount = (value: number) => Math.max(0, Math.min(recipientCap, value));

  const getCurrentHtml = (): string | null => {
    if (viewMode === "raw") {
      return rawHtml.trim() ? sanitizeHtml(rawHtml) : null;
    }
    if (!iframeRef.current?.contentDocument?.body) return null;
    const bodyContent = iframeRef.current.contentDocument.body.innerHTML;
    return sanitizeHtml(buildEmailHtml(templateStyles, bodyContent));
  };

  const handleViewModeChange = (mode: "rendered" | "raw") => {
    if (mode === viewMode) return;
    if (mode === "raw") {
      const html = getCurrentHtml();
      setRawHtml(html ?? "");
    } else {
      const { styleContent, bodyContent } = extractTemplateParts(rawHtml);
      setTemplateStyles(styleContent);
      setTemplateBody(bodyContent);
      setComposerKey((k) => k + 1);
    }
    setViewMode(mode);
  };

  const handleSelectTemplate = (value: string) => {
    setViewMode("rendered");
    if (value === "blank") {
      setSelectedTemplateId(null);
      setSubject("");
      setPreviewText("");
      setTemplateStyles(DEFAULT_STYLES);
      setTemplateBody(DEFAULT_BODY);
      setComposerKey((k) => k + 1);
      return;
    }
    const template = templates.find((t) => t.id === Number(value));
    if (!template) return;
    const { styleContent, bodyContent } = extractTemplateParts(template.html_content);
    setSelectedTemplateId(template.id);
    setSubject(template.subject);
    setPreviewText(template.preview_text ?? "");
    setTemplateStyles(styleContent);
    setTemplateBody(bodyContent);
    setComposerKey((k) => k + 1);
  };

  const openSaveDialog = () => {
    const current = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId) : undefined;
    setTemplateNameDraft(current?.name ?? "");
    setSaveTemplateDialogOpen(true);
  };

  const handleSaveAsNew = async () => {
    const html = getCurrentHtml();
    if (!html || !templateNameDraft.trim()) return;
    try {
      const template = await createTemplateMutation.mutateAsync({
        name: templateNameDraft.trim(),
        subject: subject.trim(),
        html_content: html,
        preview_text: previewText.trim() || undefined,
      });
      setSelectedTemplateId(template.id);
      toast.success("Template saved");
      setSaveTemplateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleUpdateExisting = async () => {
    if (selectedTemplateId == null) return;
    const html = getCurrentHtml();
    if (!html || !templateNameDraft.trim()) return;
    try {
      await updateTemplateMutation.mutateAsync({
        templateId: selectedTemplateId,
        payload: {
          name: templateNameDraft.trim(),
          subject: subject.trim(),
          html_content: html,
          preview_text: previewText.trim() || undefined,
        },
      });
      toast.success("Template updated");
      setSaveTemplateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplateMutation.mutateAsync(deleteTarget.id);
      if (selectedTemplateId === deleteTarget.id) {
        setSelectedTemplateId(null);
      }
      toast.success("Template deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleMembersPicked = (members: Member[]) => {
    setGuaranteed((prev) => {
      const existing = new Set(prev.map((r) => r.email.toLowerCase()));
      const additions = members
        .filter((m) => !existing.has(m.email.toLowerCase()))
        .map((m) => ({ name: m.name, email: m.email, member_id: m.id }));
      return [...prev, ...additions];
    });
    toast.success(`Added ${members.length} member${members.length !== 1 ? "s" : ""}`);
  };

  const handleAddManualGuaranteed = () => {
    const email = manualEmail.trim();
    if (!email) return;
    if (guaranteed.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      toast.error("That email is already in the guaranteed list");
      return;
    }
    setGuaranteed((prev) => [...prev, { name: manualName.trim() || email, email }]);
    setManualName("");
    setManualEmail("");
  };

  const removeGuaranteed = (email: string) => {
    setGuaranteed((prev) => prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
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

  const testEmailList = testEmails
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
  const isTestDisabled =
    !subject.trim() || isBusy || testEmailList.length === 0 || isUploadingAttachments || attachmentSizeExceeded;

  const handleTestSubmit = async () => {
    const html = getCurrentHtml();
    if (!html) return;
    try {
      const data = await testMutation.mutateAsync({
        subject: subject.trim(),
        html_content: html,
        preview_text: previewText.trim() || undefined,
        test_emails: testEmailList,
        attachments: readyAttachments,
      });
      toast.success(`Sent test email to ${data.sent_count} recipient${data.sent_count !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test blast");
    }
  };

  const totalRecipients = count + guaranteed.length;
  const isSendDisabled =
    !subject.trim() || isBusy || totalRecipients === 0 || isUploadingAttachments || attachmentSizeExceeded;

  const handleConfirmSend = async () => {
    const html = getCurrentHtml();
    if (!html) return;
    try {
      const data = await sendMutation.mutateAsync({
        subject: subject.trim(),
        html_content: html,
        preview_text: previewText.trim() || undefined,
        count,
        order_by: orderBy,
        guaranteed_recipients: guaranteed.map((r) =>
          r.member_id ? { member_id: r.member_id } : { email: r.email, name: r.name }
        ),
        attachments: readyAttachments,
      });
      setSentResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send blast");
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Compose
              </CardTitle>
              <CardDescription className="text-xs">
                Edit the email body directly, then optionally save it as a reusable template.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateId ? String(selectedTemplateId) : "blank"} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-8 w-[220px] text-xs">
                  <SelectValue placeholder="Start from template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateId !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(templates.find((t) => t.id === selectedTemplateId) ?? null)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={openSaveDialog}>
                <Save className="h-3.5 w-3.5" /> Save Template
              </Button>
            </div>
          </div>
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
                style={{ width: "375px", height: "700px", minWidth: "280px", maxWidth: "100%", resize: "horizontal" }}
              >
                {viewMode === "raw" ? (
                  <Textarea
                    value={rawHtml}
                    onChange={(e) => setRawHtml(e.target.value)}
                    spellCheck={false}
                    placeholder="<html>...</html>"
                    className="resize-none border-0 rounded-none font-mono text-xs h-full w-full"
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
                        <style>${templateStyles}</style>
                        <style>
                          body { padding: 10px; min-height: 100%; direction: rtl; margin: 0; background-color: #f1f5f9; }
                        </style>
                      </head>
                      <body contenteditable="true" dir="rtl" style="background-color:#f1f5f9;margin:0">${templateBody}</body>
                      </html>`}
                    className="border-0 h-full w-full"
                  />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blast-subject">Subject</Label>
                <Input
                  id="blast-subject"
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blast-preview-text">Preview Text (optional)</Label>
                <Input
                  id="blast-preview-text"
                  placeholder="Shown as a preview snippet in inboxes..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Audience
            </CardTitle>
            <CardDescription className="text-xs">
              Choose how many members to reach and in what order they&apos;re selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recipient count</Label>
                <Input
                  type="number"
                  min={0}
                  max={recipientCap}
                  value={count}
                  onChange={(e) => setCount(clampCount(Number(e.target.value) || 0))}
                  disabled={isBusy}
                  className="h-8 w-24 text-xs"
                />
              </div>
              <div className="relative py-1">
                <Slider
                  value={[count]}
                  min={0}
                  max={sliderMax}
                  step={1}
                  disabled={isBusy || eligibleCount === 0}
                  onValueChange={([v]) => setCount(clampCount(v))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Order</Label>
              <Select value={orderBy} onValueChange={(v) => setOrderBy(v as BlastOrderBy)} disabled={isBusy}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">Most recently active</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Guaranteed Recipients {guaranteed.length > 0 && `(${guaranteed.length})`}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => setMemberDialogOpen(true)}
                  disabled={isBusy}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Pick Members
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                These always receive the blast, on top of the {count} selected above.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Name (optional)"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  disabled={isBusy}
                  className="h-8 text-xs"
                />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  disabled={isBusy}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddManualGuaranteed}
                  disabled={isBusy || !manualEmail.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {guaranteed.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
                  {guaranteed.map((r) => (
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
                        onClick={() => removeGuaranteed(r.email)}
                        disabled={isBusy}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              Up to <span className="text-foreground font-bold">{totalRecipients}</span> recipients — {count} by{" "}
              {ORDER_LABELS[orderBy]} + {guaranteed.length} guaranteed.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              Attachments
            </CardTitle>
            <CardDescription className="text-xs">Optional files included with every send.</CardDescription>
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
          </CardContent>
        </Card>
      </div>

      <Collapsible open={testSectionOpen} onOpenChange={setTestSectionOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between">
            <span>Test Mode</span>
            {testSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="blast-test-emails">Test Email Addresses</Label>
            <Textarea
              id="blast-test-emails"
              placeholder="Enter comma-separated emails (e.g., test1@example.com, test2@example.com)"
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              disabled={isBusy}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Sends the current draft to these addresses only — the audience settings above are ignored and nothing
              is logged as a real send.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={handleTestSubmit} disabled={isTestDisabled} className="w-full">
            {testMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Test ({testEmailList.length})
              </>
            )}
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={isSendDisabled} className="h-9 gap-2 shadow-sm">
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Blast{totalRecipients > 0 ? ` (${totalRecipients})` : ""}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send this blast?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;re about to email up to <strong>{totalRecipients}</strong> people ({count} by{" "}
                {ORDER_LABELS[orderBy]} + {guaranteed.length} guaranteed). This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSend}>Send</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
              {sentResult.algorithmic_count} selected by ordering + {sentResult.guaranteed_count} guaranteed. Sending
              in the background — a log entry will appear in Email Logs once it completes (one per email address
              used, if it had to split across both).
            </p>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              View Email Logs
            </Button>
          </CardContent>
        </Card>
      )}

      <MemberSearchDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} onConfirm={handleMembersPicked} />

      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>Saves the subject and email body. Attachments are not included.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateNameDraft}
              onChange={(e) => setTemplateNameDraft(e.target.value)}
              placeholder="e.g. Monthly Newsletter"
            />
          </div>
          <DialogFooter>
            {selectedTemplateId !== null && (
              <Button
                variant="outline"
                onClick={handleUpdateExisting}
                disabled={!templateNameDraft.trim() || updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Existing
              </Button>
            )}
            <Button onClick={handleSaveAsNew} disabled={!templateNameDraft.trim() || createTemplateMutation.isPending}>
              {createTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save as New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>{deleteTarget.name}</strong> will be permanently deleted. This can&apos;t be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

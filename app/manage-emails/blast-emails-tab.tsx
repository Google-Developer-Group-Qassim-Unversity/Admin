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

import { cn } from "@/lib/utils";
import type { BlastOrderBy, BlastSendResponse, EmailProvider, EmailTemplate } from "@/lib/api-types";
import {
  useBlastEligibleCount,
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplates,
  useSendBlastEmail,
  useSendBlastEmailTest,
  useUpdateEmailTemplate,
} from "@/hooks/use-blast-email";
import { useEmailComposer } from "@/hooks/use-email-composer";
import {
  useAttachmentUploads,
  MAX_ATTACHMENT_FILE_SIZE,
  MAX_TOTAL_ATTACHMENT_SIZE,
  MAX_ATTACHMENT_FILES,
} from "@/hooks/use-attachment-uploads";
import { useRecipientList } from "@/hooks/use-recipient-list";
import { MemberSearchDialog } from "./member-search-dialog";
import { ProviderSelect } from "./provider-select";
import { EmailJobStatusCard } from "@/components/email-job-status-card";
import { DEFAULT_BODY, DEFAULT_STYLES, extractTemplateParts, formatSize } from "./email-composer-utils";
import { useTranslations } from "next-intl";

export function BlastEmailsTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const t = useTranslations("manageEmails.blast");
  const tDirect = useTranslations("manageEmails.directEmail");
  const tc = useTranslations("common.actions");
  const { getToken } = useAuth();
  const ORDER_LABELS: Record<BlastOrderBy, string> = {
    activity: t("orderLabels.activity"),
    alphabetical: t("orderLabels.alphabetical"),
  };

  const [subject, setSubject] = React.useState("");
  const [previewText, setPreviewText] = React.useState("");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | null>(null);

  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = React.useState(false);
  const [templateNameDraft, setTemplateNameDraft] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<EmailTemplate | null>(null);

  const [count, setCount] = React.useState(0);
  const [provider, setProvider] = React.useState<EmailProvider>("google");
  const [orderBy, setOrderBy] = React.useState<BlastOrderBy>("activity");
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);

  const [testSectionOpen, setTestSectionOpen] = React.useState(false);
  const [testEmails, setTestEmails] = React.useState("");

  const [sentResult, setSentResult] = React.useState<BlastSendResponse | null>(null);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const composer = useEmailComposer(iframeRef, {
    initialBody: DEFAULT_BODY,
    initialStyles: DEFAULT_STYLES,
    trackStyles: true,
  });
  const recipientList = useRecipientList({ duplicateMessage: t("guaranteedDuplicate") });
  const attachments = useAttachmentUploads(getToken, MAX_TOTAL_ATTACHMENT_SIZE);

  const eligibleCountQuery = useBlastEligibleCount(provider, getToken);
  const templatesQuery = useEmailTemplates(getToken);
  const createTemplateMutation = useCreateEmailTemplate(getToken);
  const updateTemplateMutation = useUpdateEmailTemplate(getToken);
  const deleteTemplateMutation = useDeleteEmailTemplate(getToken);
  const sendMutation = useSendBlastEmail(getToken);
  const testMutation = useSendBlastEmailTest(getToken);

  const eligibleCount = eligibleCountQuery.data?.eligible_count ?? 0;
  const remainingCapacity = eligibleCountQuery.data?.remaining_capacity ?? null;
  const templates = templatesQuery.data ?? [];
  const isBusy = sendMutation.isPending || testMutation.isPending;

  const recipientCap =
    remainingCapacity === null ? eligibleCount : Math.min(eligibleCount, remainingCapacity);
  const sliderMax = Math.max(recipientCap, 1);
  const clampCount = (value: number) => Math.max(0, Math.min(recipientCap, value));

  React.useEffect(() => {
    setCount((prev) => clampCount(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientCap]);

  const handleSelectTemplate = (value: string) => {
    if (value === "blank") {
      setSelectedTemplateId(null);
      setSubject("");
      setPreviewText("");
      composer.loadContent(DEFAULT_BODY, DEFAULT_STYLES);
      return;
    }
    const template = templates.find((t) => t.id === Number(value));
    if (!template) return;
    const { styleContent, bodyContent } = extractTemplateParts(template.html_content);
    setSelectedTemplateId(template.id);
    setSubject(template.subject);
    setPreviewText(template.preview_text ?? "");
    composer.loadContent(bodyContent, styleContent);
  };

  const openSaveDialog = () => {
    const current = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId) : undefined;
    setTemplateNameDraft(current?.name ?? "");
    setSaveTemplateDialogOpen(true);
  };

  const handleSaveAsNew = async () => {
    const html = composer.getCurrentHtml();
    if (!html || !templateNameDraft.trim()) return;
    try {
      const template = await createTemplateMutation.mutateAsync({
        name: templateNameDraft.trim(),
        subject: subject.trim(),
        html_content: html,
        preview_text: previewText.trim() || undefined,
      });
      setSelectedTemplateId(template.id);
      toast.success(t("templateSaved"));
      setSaveTemplateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("templateSaveFailed"));
    }
  };

  const handleUpdateExisting = async () => {
    if (selectedTemplateId == null) return;
    const html = composer.getCurrentHtml();
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
      toast.success(t("templateUpdated"));
      setSaveTemplateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("templateUpdateFailed"));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplateMutation.mutateAsync(deleteTarget.id);
      if (selectedTemplateId === deleteTarget.id) {
        setSelectedTemplateId(null);
      }
      toast.success(t("templateDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("templateDeleteFailed"));
    } finally {
      setDeleteTarget(null);
    }
  };

  const testEmailList = testEmails
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
  const isTestDisabled =
    !subject.trim() ||
    isBusy ||
    testEmailList.length === 0 ||
    attachments.isUploadingAttachments ||
    attachments.attachmentSizeExceeded;

  const handleTestSubmit = async () => {
    const html = composer.getCurrentHtml();
    if (!html) return;
    try {
      const data = await testMutation.mutateAsync({
        subject: subject.trim(),
        html_content: html,
        preview_text: previewText.trim() || undefined,
        test_emails: testEmailList,
        attachments: attachments.readyAttachments,
        provider,
      });
      toast.success(t("testSent", { count: data.sent_count }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("testFailed"));
    }
  };

  const totalRecipients = count + recipientList.recipients.length;
  const isSendDisabled =
    !subject.trim() ||
    isBusy ||
    totalRecipients === 0 ||
    attachments.isUploadingAttachments ||
    attachments.attachmentSizeExceeded;

  const handleConfirmSend = async () => {
    const html = composer.getCurrentHtml();
    if (!html) return;
    try {
      const data = await sendMutation.mutateAsync({
        subject: subject.trim(),
        html_content: html,
        preview_text: previewText.trim() || undefined,
        count,
        order_by: orderBy,
        guaranteed_recipients: recipientList.recipients.map((r) =>
          r.member_id ? { member_id: r.member_id } : { email: r.email, name: r.name }
        ),
        attachments: attachments.readyAttachments,
        provider,
      });
      setSentResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sendFailed"));
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
                {tDirect("compose")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("composeHint")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateId ? String(selectedTemplateId) : "blank"} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-8 w-[220px] text-xs">
                  <SelectValue placeholder={t("startFromTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">{t("blank")}</SelectItem>
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
                <Save className="h-3.5 w-3.5" /> {t("saveTemplate")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <Label>{tDirect("emailContent")}</Label>
                <div className="inline-flex rounded-md border p-0.5">
                  <button
                    type="button"
                    onClick={() => composer.handleViewModeChange("rendered")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-sm transition-colors",
                      composer.viewMode === "rendered"
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tDirect("rendered")}
                  </button>
                  <button
                    type="button"
                    onClick={() => composer.handleViewModeChange("raw")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-sm transition-colors",
                      composer.viewMode === "raw"
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tDirect("rawHtml")}
                  </button>
                </div>
              </div>
              <div
                className="border rounded-md overflow-auto"
                style={{ width: "375px", height: "700px", minWidth: "280px", maxWidth: "100%", resize: "horizontal" }}
              >
                {composer.viewMode === "raw" ? (
                  <Textarea
                    value={composer.rawHtml}
                    onChange={(e) => composer.setRawHtml(e.target.value)}
                    spellCheck={false}
                    placeholder="<html>...</html>"
                    className="resize-none border-0 rounded-none font-mono text-xs h-full w-full"
                  />
                ) : (
                  <iframe
                    key={composer.composerKey}
                    ref={iframeRef}
                    srcDoc={composer.iframeSrcDoc}
                    className="border-0 h-full w-full"
                  />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blast-subject">{tDirect("subject")}</Label>
                <Input
                  id="blast-subject"
                  placeholder={tDirect("subjectPlaceholder")}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blast-preview-text">{t("previewText")}</Label>
                <Input
                  id="blast-preview-text"
                  placeholder={t("previewTextPlaceholder")}
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
              {t("audience")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("audienceHint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProviderSelect value={provider} onChange={setProvider} disabled={isBusy} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("recipientCount")}</Label>
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
                  disabled={isBusy || recipientCap === 0}
                  onValueChange={([v]) => setCount(clampCount(v))}
                />
              </div>
              {remainingCapacity !== null && remainingCapacity < eligibleCount && (
                <p className="text-[11px] text-muted-foreground">
                  {t("cappedHint", { remaining: remainingCapacity, eligible: eligibleCount })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("order")}</Label>
              <Select value={orderBy} onValueChange={(v) => setOrderBy(v as BlastOrderBy)} disabled={isBusy}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">{t("mostRecentlyActive")}</SelectItem>
                  <SelectItem value="alphabetical">{t("alphabeticalAz")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {t("guaranteedRecipients", { count: recipientList.recipients.length > 0 ? `(${recipientList.recipients.length})` : "" })}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => setMemberDialogOpen(true)}
                  disabled={isBusy}
                >
                  <UserPlus className="h-3.5 w-3.5" /> {tDirect("pickMembers")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("guaranteedHint", { count })}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder={tDirect("namePlaceholder")}
                  value={recipientList.manualName}
                  onChange={(e) => recipientList.setManualName(e.target.value)}
                  disabled={isBusy}
                  className="h-8 text-xs"
                />
                <Input
                  type="email"
                  placeholder={tDirect("emailPlaceholder")}
                  value={recipientList.manualEmail}
                  onChange={(e) => recipientList.setManualEmail(e.target.value)}
                  disabled={isBusy}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={recipientList.addManual}
                  disabled={isBusy || !recipientList.manualEmail.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {recipientList.recipients.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
                  {recipientList.recipients.map((r) => (
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
                        onClick={() => recipientList.remove(r.email)}
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
              {t("totalRecipients", {
                total: totalRecipients,
                count,
                order: ORDER_LABELS[orderBy],
                guaranteed: recipientList.recipients.length,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              {tDirect("attachments")}
            </CardTitle>
            <CardDescription className="text-xs">{t("attachmentsHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <FileUpload
              multiple
              maxFiles={MAX_ATTACHMENT_FILES}
              maxSize={MAX_ATTACHMENT_FILE_SIZE}
              accept="image/*,application/pdf"
              value={attachments.files}
              onAccept={attachments.handleFilesAccepted}
              onFileReject={(_file, message) => toast.error(message)}
              disabled={isBusy}
            >
              <FileUploadDropzone className="min-h-20 flex-col">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">{tDirect("dropzoneHint")}</p>
                <p className="text-xs text-muted-foreground">
                  {tDirect("dropzoneLimits", { max: MAX_ATTACHMENT_FILES, size: formatSize(MAX_ATTACHMENT_FILE_SIZE) })}
                </p>
              </FileUploadDropzone>
              <FileUploadList>
                {attachments.attachmentEntries.map((entry) => (
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
                        onClick={() => attachments.handleRemoveFile(entry.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </FileUploadItemDelete>
                  </FileUploadItem>
                ))}
              </FileUploadList>
            </FileUpload>
            {attachments.attachmentSizeExceeded && (
              <p className="text-xs text-destructive">
                {tDirect("sizeExceeded", {
                  total: formatSize(attachments.totalAttachmentSize),
                  limit: formatSize(MAX_TOTAL_ATTACHMENT_SIZE),
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Collapsible open={testSectionOpen} onOpenChange={setTestSectionOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between">
            <span>{t("testMode")}</span>
            {testSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="blast-test-emails">{t("testEmailAddresses")}</Label>
            <Textarea
              id="blast-test-emails"
              placeholder={t("testEmailsPlaceholder")}
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              disabled={isBusy}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t("testModeHint")}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={handleTestSubmit} disabled={isTestDisabled} className="w-full">
            {testMutation.isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("sendingTest")}
              </>
            ) : (
              <>
                <Mail className="me-2 h-4 w-4" />
                {t("sendTest", { count: testEmailList.length })}
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
              {t("sendBlast", { count: totalRecipients })}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("confirmDescription", {
                  total: totalRecipients,
                  count,
                  order: ORDER_LABELS[orderBy],
                  guaranteed: recipientList.recipients.length,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSend}>{t("send")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {sentResult && (
        <EmailJobStatusCard
          jobId={sentResult.job_id}
          getToken={getToken}
          itemKey="email"
          totalHint={sentResult.recipient_count}
          description={t("jobDescription", {
            algo: sentResult.algorithmic_count,
            guaranteed: sentResult.guaranteed_count,
          })}
          onGoToLogs={onGoToLogs}
        />
      )}

      <MemberSearchDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} onConfirm={recipientList.addMembers} />

      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("saveTemplate")}</DialogTitle>
            <DialogDescription>{t("saveTemplateDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="template-name">{t("templateName")}</Label>
            <Input
              id="template-name"
              value={templateNameDraft}
              onChange={(e) => setTemplateNameDraft(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
            />
          </div>
          <DialogFooter>
            {selectedTemplateId !== null && (
              <Button
                variant="outline"
                onClick={handleUpdateExisting}
                disabled={!templateNameDraft.trim() || updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("updateExisting")}
              </Button>
            )}
            <Button onClick={handleSaveAsNew} disabled={!templateNameDraft.trim() || createTemplateMutation.isPending}>
              {createTemplateMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("saveAsNew")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTemplateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t.rich("deleteTemplateRich", { strong: (chunks) => <strong>{chunks}</strong>, name: deleteTarget.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4" /> {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

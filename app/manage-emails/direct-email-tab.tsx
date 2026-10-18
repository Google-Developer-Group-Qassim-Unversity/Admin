"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Mail, UserPlus, X, Upload, Send, Paperclip, Plus } from "lucide-react";

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

import type { DirectEmailResponse, EmailProvider } from "@/lib/api-types";
import { useSendDirectEmail } from "@/hooks/use-direct-email";
import { useEmailComposer } from "@/hooks/use-email-composer";
import {
  useAttachmentUploads,
  MAX_ATTACHMENT_FILE_SIZE,
  MAX_TOTAL_ATTACHMENT_SIZE,
  MAX_ATTACHMENT_FILES,
} from "@/hooks/use-attachment-uploads";
import { useRecipientList } from "@/hooks/use-recipient-list";
import { EmailJobStatusCard } from "@/components/email-job-status-card";
import { FormActions } from "@/components/form-actions";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MemberSearchDialog } from "./member-search-dialog";
import { ProviderSelect } from "./provider-select";
import { DEFAULT_BODY, DEFAULT_STYLES, formatSize } from "./email-composer-utils";
import { useTranslations } from "next-intl";

export function DirectEmailTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const t = useTranslations("manageEmails.directEmail");
  const tc = useTranslations("common.actions");
  const { getToken } = useAuth();

  const [subject, setSubject] = React.useState("");
  const [provider, setProvider] = React.useState<EmailProvider>("google");
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [sentResult, setSentResult] = React.useState<DirectEmailResponse | null>(null);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const composer = useEmailComposer(iframeRef, { initialBody: DEFAULT_BODY, initialStyles: DEFAULT_STYLES });
  const recipientList = useRecipientList();
  const attachments = useAttachmentUploads(getToken, MAX_TOTAL_ATTACHMENT_SIZE);

  const sendMutation = useSendDirectEmail(getToken);
  const isBusy = sendMutation.isPending;

  const isSendDisabled =
    !subject.trim() ||
    recipientList.recipients.length === 0 ||
    isBusy ||
    attachments.isUploadingAttachments ||
    attachments.attachmentSizeExceeded;

  const handleSend = async () => {
    const html = composer.getCurrentHtml();
    if (!html || recipientList.recipients.length === 0) return;
    try {
      const data = await sendMutation.mutateAsync({
        subject: subject.trim(),
        html_content: html,
        recipients: recipientList.recipients.map((r) =>
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-ink-2" />
            {t("recipients")} {recipientList.recipients.length > 0 && `(${recipientList.recipients.length})`}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("recipientsHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Phone: name on its own row, email + add beneath it. sm+: one row. */}
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder={t("namePlaceholder")}
              aria-label={t("namePlaceholder")}
              autoComplete="off"
              enterKeyHint="next"
              value={recipientList.manualName}
              onChange={(e) => recipientList.setManualName(e.target.value)}
              disabled={isBusy}
              className="col-span-2 sm:col-span-1"
            />
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              enterKeyHint="done"
              placeholder={t("emailPlaceholder")}
              aria-label={t("emailPlaceholder")}
              value={recipientList.manualEmail}
              onChange={(e) => recipientList.setManualEmail(e.target.value)}
              disabled={isBusy}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={tc("add")}
              className="shrink-0"
              onClick={recipientList.addManual}
              disabled={isBusy || !recipientList.manualEmail.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
            onClick={() => setMemberDialogOpen(true)}
            disabled={isBusy}
          >
            <UserPlus className="h-3.5 w-3.5" /> {t("pickMembers")}
          </Button>
          {recipientList.recipients.length > 0 && (
            <div className="max-h-60 overflow-y-auto overscroll-contain rounded-lg ring-1 ring-rule divide-y divide-rule sm:max-h-40">
              {recipientList.recipients.map((r) => (
                <div key={r.email} className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p dir="auto" className="text-sm font-medium truncate sm:text-xs">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate"><bdi>{r.email}</bdi></p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={tc("remove")}
                    className="hover:text-door-madder-ink sm:size-6"
                    onClick={() => recipientList.remove(r.email)}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-ink-2" />
            {t("compose")}
          </CardTitle>
          <CardDescription className="text-xs">{t("composeHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="min-w-0 lg:flex-shrink-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label>{t("emailContent")}</Label>
                <SegmentedControl
                  label={t("emailContent")}
                  value={composer.viewMode}
                  onValueChange={(v) => composer.handleViewModeChange(v as "rendered" | "raw")}
                  options={[
                    { value: "rendered", label: t("rendered") },
                    { value: "raw", label: t("rawHtml") },
                  ]}
                  className="w-auto shrink-0 p-0.5 [&>button]:min-h-8 [&>button]:px-2.5 [&>button]:text-xs [&>button]:whitespace-nowrap pointer-coarse:[&>button]:min-h-9"
                />
              </div>
              <div className="ring-1 ring-rule rounded-lg overflow-auto bg-white h-[65dvh] min-h-[420px] w-full max-w-full resize-none lg:h-[500px] lg:w-[375px] lg:min-w-[280px] lg:resize-x">
                {composer.viewMode === "raw" ? (
                  <textarea
                    value={composer.rawHtml}
                    onChange={(e) => composer.setRawHtml(e.target.value)}
                    spellCheck={false}
                    placeholder="<html>...</html>"
                    className="resize-none border-0 rounded-none font-mono text-xs h-full w-full p-3 outline-none"
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
                <Label htmlFor="direct-subject">{t("subject")}</Label>
                <Input
                  id="direct-subject"
                  dir="auto"
                  enterKeyHint="done"
                  placeholder={t("subjectPlaceholder")}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-ink-2" />
            {t("attachments")}
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
              <p className="mt-1 text-xs text-muted-foreground">{t("dropzoneHint")}</p>
              <p className="text-xs text-muted-foreground">
                {t("dropzoneLimits", { max: MAX_ATTACHMENT_FILES, size: formatSize(MAX_ATTACHMENT_FILE_SIZE) })}
              </p>
            </FileUploadDropzone>
            <FileUploadList>
              {attachments.attachmentEntries.map((entry) => (
                <FileUploadItem key={`${entry.file.name}-${entry.file.lastModified}`} value={entry.file}>
                  <FileUploadItemPreview />
                  <FileUploadItemMetadata />
                  {entry.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-muted-foreground" />}
                  <FileUploadItemDelete asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={tc("remove")}
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
            <p className="text-[13px] font-medium text-door-madder-ink">
              {t("sizeExceeded", {
                total: formatSize(attachments.totalAttachmentSize),
                limit: formatSize(MAX_TOTAL_ATTACHMENT_SIZE),
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <FormActions>
        <Button type="button" variant="ochre" size="lg" onClick={handleSend} disabled={isSendDisabled}>
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}
          {t("send", { count: recipientList.recipients.length })}
        </Button>
      </FormActions>

      {sentResult && (
        <EmailJobStatusCard
          jobId={sentResult.job_id}
          getToken={getToken}
          itemKey="email"
          totalHint={sentResult.recipient_count}
          onGoToLogs={onGoToLogs}
        />
      )}

      <MemberSearchDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} onConfirm={recipientList.addMembers} />
    </div>
  );
}

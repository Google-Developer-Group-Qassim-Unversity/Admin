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

import { cn } from "@/lib/utils";
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
import { MemberSearchDialog } from "./member-search-dialog";
import { ProviderSelect } from "./provider-select";
import { DEFAULT_BODY, DEFAULT_STYLES, formatSize } from "./email-composer-utils";
import { useTranslations } from "next-intl";

export function DirectEmailTab({ onGoToLogs }: { onGoToLogs: () => void }) {
  const t = useTranslations("manageEmails.directEmail");
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
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {t("recipients")} {recipientList.recipients.length > 0 && `(${recipientList.recipients.length})`}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("recipientsHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t("namePlaceholder")}
              value={recipientList.manualName}
              onChange={(e) => recipientList.setManualName(e.target.value)}
              disabled={isBusy}
              className="h-9"
            />
            <Input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={recipientList.manualEmail}
              onChange={(e) => recipientList.setManualEmail(e.target.value)}
              disabled={isBusy}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
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
            className="h-8 text-xs gap-1.5"
            onClick={() => setMemberDialogOpen(true)}
            disabled={isBusy}
          >
            <UserPlus className="h-3.5 w-3.5" /> {t("pickMembers")}
          </Button>
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
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {t("compose")}
          </CardTitle>
          <CardDescription className="text-xs">{t("composeHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <Label>{t("emailContent")}</Label>
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
                    {t("rendered")}
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
                    {t("rawHtml")}
                  </button>
                </div>
              </div>
              <div
                className="border rounded-md overflow-auto"
                style={{ width: "375px", height: "500px", minWidth: "280px", maxWidth: "100%", resize: "horizontal" }}
              >
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

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
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
              {t("sizeExceeded", {
                total: formatSize(attachments.totalAttachmentSize),
                limit: formatSize(MAX_TOTAL_ATTACHMENT_SIZE),
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSend} disabled={isSendDisabled} className="h-9 gap-2 shadow-sm">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("send", { count: recipientList.recipients.length })}
        </Button>
      </div>

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

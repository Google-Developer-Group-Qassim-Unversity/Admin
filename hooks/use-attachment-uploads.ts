import * as React from "react";
import { toast } from "sonner";

import { useTranslations } from "next-intl";
import { useApi } from "@/lib/api/client";
import { isolate } from "@/lib/format";
import type { EmailAttachmentInfo } from "@/lib/api-types";

export const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024;
export const MAX_ATTACHMENT_FILES = 5;

interface AttachmentEntry {
  file: File;
  status: "uploading" | "done" | "error";
  info?: EmailAttachmentInfo;
}

/**
 * Owns the Mail composer's upload-one-attachment-at-a-time flow: track each
 * file's upload status, surface a toast on failure, and derive the
 * ready-to-send attachment list and total size.
 */
export function useAttachmentUploads(maxTotalSize: number = MAX_TOTAL_ATTACHMENT_SIZE) {
  const api = useApi();
  const t = useTranslations("manageEmails.composer");
  const [attachmentEntries, setAttachmentEntries] = React.useState<AttachmentEntry[]>([]);

  const handleFilesAccepted = async (newFiles: File[]) => {
    setAttachmentEntries((prev) => [...prev, ...newFiles.map((file) => ({ file, status: "uploading" as const }))]);

    for (const file of newFiles) {
      try {
        const info = await api.emails.uploadAttachment(file);
        setAttachmentEntries((prev) => prev.map((entry) => entry.file === file ? { file, status: "done", info } : entry));
      } catch {
        setAttachmentEntries((prev) => prev.map((entry) => entry.file === file ? { file, status: "error" } : entry));
        toast.error(t("uploadFailed", { filename: isolate(file.name) }));
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
  const attachmentSizeExceeded = totalAttachmentSize > maxTotalSize;

  return {
    attachmentEntries,
    files,
    readyAttachments,
    isUploadingAttachments,
    hasFailedAttachments: attachmentEntries.some((entry) => entry.status === "error"),
    totalAttachmentSize,
    attachmentSizeExceeded,
    handleFilesAccepted,
    handleRemoveFile,
  };
}

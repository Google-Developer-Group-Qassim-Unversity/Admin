import * as React from "react";
import { toast } from "sonner";

import { uploadEmailAttachment } from "@/lib/api";
import type { EmailAttachmentInfo } from "@/lib/api-types";

export const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024;
export const MAX_ATTACHMENT_FILES = 5;

interface AttachmentEntry {
  file: File;
  status: "uploading" | "done" | "error";
  info?: EmailAttachmentInfo;
}

type GetTokenFn = () => Promise<string | null>;

/**
 * Owns the upload-one-attachment-at-a-time flow shared by the direct-email
 * and blast composers: track each file's upload status, surface a toast on
 * failure, and derive the ready-to-send attachment list and total size.
 */
export function useAttachmentUploads(getToken?: GetTokenFn, maxTotalSize: number = MAX_TOTAL_ATTACHMENT_SIZE) {
  const [attachmentEntries, setAttachmentEntries] = React.useState<AttachmentEntry[]>([]);

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
  const attachmentSizeExceeded = totalAttachmentSize > maxTotalSize;

  return {
    attachmentEntries,
    files,
    readyAttachments,
    isUploadingAttachments,
    totalAttachmentSize,
    attachmentSizeExceeded,
    handleFilesAccepted,
    handleRemoveFile,
  };
}

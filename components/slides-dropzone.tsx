'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
} from '@/components/ui/file-upload';
import { useUploadDriveSlides } from '@/hooks/use-event';
import { ApiRequestError } from '@/lib/api';

interface SlidesDropzoneProps {
  eventId: number;
  onDriveUnconfigured?: () => void;
}

export function SlidesDropzone({ eventId, onDriveUnconfigured }: SlidesDropzoneProps) {
  const t = useTranslations('eventContent');
  const uploadSlides = useUploadDriveSlides(eventId);
  const [files, setFiles] = React.useState<File[]>([]);

  const handleUpload = async (
    filesToUpload: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    }
  ) => {
    for (const file of filesToUpload) {
      try {
        await uploadSlides.mutateAsync({
          file,
          onProgress: (progress) => options.onProgress(file, progress),
        });
        options.onSuccess(file);
        toast.success(t('uploadSuccess', { name: file.name }));
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        options.onError(file, error);

        if (err instanceof ApiRequestError) {
          if (err.status === 503 || err.message.toLowerCase().includes('not configured')) {
            onDriveUnconfigured?.();
            toast.error(t('driveUnconfigured'));
            continue;
          }
        }
        toast.error(t('uploadFailed', { name: file.name }), {
          description: error.message,
        });
      }
    }
  };

  return (
    <div className="space-y-3">
      <FileUpload
        multiple
        maxSize={100 * 1024 * 1024}
        accept=".pdf,.pptx,.ppt,.key,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        value={files}
        onValueChange={setFiles}
        onUpload={handleUpload}
      >
        <FileUploadDropzone className="flex-col min-h-28 py-6 cursor-pointer border-dashed hover:border-primary/50 transition-colors">
          <Upload className="h-7 w-7 text-muted-foreground mb-1" />
          <p className="text-sm font-medium text-foreground text-center">
            {t('dropzoneTitle')}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-0.5">
            {t('dropzoneHint')}
          </p>
        </FileUploadDropzone>

        <FileUploadList className="mt-3">
          {files.map((file) => (
            <FileUploadItem key={`${file.name}-${file.lastModified}`} value={file} className="bg-background">
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <div className="flex items-center gap-2">
                <FileUploadItemProgress variant="circular" size={28} />
                <FileUploadItemDelete asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={t('remove')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </FileUploadItemDelete>
              </div>
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>
    </div>
  );
}

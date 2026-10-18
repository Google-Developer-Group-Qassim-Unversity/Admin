'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUploadDriveSlides } from '@/hooks/use-event';
import { ApiRequestError } from '@/lib/api';
import { cn, formatBytes } from '@/lib/utils';

interface SlidesDropzoneProps {
  eventId: number;
  onDriveUnconfigured?: () => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.pptx', '.ppt', '.key', '.odp'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function isValidPresentation(file: File): { valid: boolean; reason?: string } {
  const name = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExt) {
    return { valid: false, reason: 'unsupported' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, reason: 'too_large' };
  }
  return { valid: true };
}

export function SlidesDropzone({ eventId, onDriveUnconfigured }: SlidesDropzoneProps) {
  const t = useTranslations('eventContent');
  const uploadSlides = useUploadDriveSlides(eventId);

  const [stagedFiles, setStagedFiles] = React.useState<File[]>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  // Drag states
  const [isDropzoneDragging, setIsDropzoneDragging] = React.useState(false);
  const [isModalDragging, setIsModalDragging] = React.useState(false);

  const dropzoneDragCounter = React.useRef(0);
  const modalDragCounter = React.useRef(0);

  const mainFileInputRef = React.useRef<HTMLInputElement>(null);
  const addMoreInputRef = React.useRef<HTMLInputElement>(null);

  // Prevent browser navigation when files are dropped anywhere on the window
  React.useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);
    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);

  const processIncomingFiles = (incoming: File[], openModalAfter = true) => {
    const validFiles: File[] = [];
    for (const f of incoming) {
      const check = isValidPresentation(f);
      if (check.valid) {
        validFiles.push(f);
      } else if (check.reason === 'too_large') {
        toast.error(t('uploadFailed', { name: f.name }), {
          description: t('uploadSizeLimit'),
        });
      } else {
        toast.error(t('uploadFailed', { name: f.name }), {
          description: t('uploadUnsupportedType'),
        });
      }
    }

    if (validFiles.length === 0) return;

    setStagedFiles((prev) => {
      const existingSignatures = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const unique = validFiles.filter(
        (f) => !existingSignatures.has(`${f.name}-${f.size}-${f.lastModified}`)
      );
      return [...prev, ...unique];
    });

    if (openModalAfter) {
      setConfirmOpen(true);
    }
  };

  // --- Main Dropzone Drag & Drop Handlers ---
  const handleDropzoneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneDragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDropzoneDragging(true);
    }
  };

  const handleDropzoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneDragCounter.current -= 1;
    if (dropzoneDragCounter.current <= 0) {
      dropzoneDragCounter.current = 0;
      setIsDropzoneDragging(false);
    }
  };

  const handleDropzoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneDragCounter.current = 0;
    setIsDropzoneDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(Array.from(e.dataTransfer.files), true);
    }
  };

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(Array.from(e.target.files), true);
    }
    if (e.target) e.target.value = '';
  };

  // --- Modal Drag & Drop Handlers ---
  const handleModalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    modalDragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsModalDragging(true);
    }
  };

  const handleModalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    modalDragCounter.current -= 1;
    if (modalDragCounter.current <= 0) {
      modalDragCounter.current = 0;
      setIsModalDragging(false);
    }
  };

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    modalDragCounter.current = 0;
    setIsModalDragging(false);
    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(Array.from(e.dataTransfer.files), false);
    }
  };

  const handleAddMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(Array.from(e.target.files), false);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveStaged = (index: number) => {
    const updated = stagedFiles.filter((_, idx) => idx !== index);
    setStagedFiles(updated);
    if (updated.length === 0) {
      setConfirmOpen(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && !isUploading) {
      setConfirmOpen(false);
      setStagedFiles([]);
      modalDragCounter.current = 0;
      setIsModalDragging(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (stagedFiles.length === 0 || isUploading) return;
    setIsUploading(true);

    const successfulIndices = new Set<number>();
    try {
      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        try {
          // Note: Modal upload uses an indeterminate spinner for fast uploads. useUploadDriveSlides'
          // onProgress parameter remains available for callers needing fine-grained progress bars.
          await uploadSlides.mutateAsync({ file });
          successfulIndices.add(i);
          toast.success(t('uploadSuccess', { name: file.name }));
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          if (err instanceof ApiRequestError) {
            if (err.status === 503 || err.message.toLowerCase().includes('not configured')) {
              onDriveUnconfigured?.();
              toast.error(t('driveUnconfigured'));
              break;
            }
          }
          toast.error(t('uploadFailed', { name: file.name }), {
            description: error.message,
          });
        }
      }
    } finally {
      setIsUploading(false);
      modalDragCounter.current = 0;
      setIsModalDragging(false);

      if (successfulIndices.size === stagedFiles.length) {
        setConfirmOpen(false);
        setStagedFiles([]);
      } else {
        // Retain failed AND unattempted files so user can review and retry
        setStagedFiles((prev) => prev.filter((_, idx) => !successfulIndices.has(idx)));
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input for main dropzone */}
      <input
        ref={mainFileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.ppt,.key,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={handleMainFileChange}
      />

      {/* Main Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => mainFileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            mainFileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDropzoneDragEnter}
        onDragLeave={handleDropzoneDragLeave}
        onDragOver={handleDropzoneDragOver}
        onDrop={handleDropzoneDrop}
        className={cn(
          'flex flex-col items-center justify-center min-h-28 py-6 px-4 rounded-xl cursor-pointer border-2 border-dashed transition-all select-none text-center outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDropzoneDragging
            ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <Upload
          className={cn(
            'h-7 w-7 mb-2 transition-transform',
            isDropzoneDragging ? 'text-primary scale-110' : 'text-muted-foreground'
          )}
        />
        <p className="text-sm font-medium text-foreground">
          {isDropzoneDragging ? t('dropFilesToAdd') : t('dropzoneTitle')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('dropzoneHint')}</p>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className={cn(
            'sm:max-w-md gap-4 overflow-hidden transition-all',
            isModalDragging && 'ring-2 ring-primary border-primary'
          )}
          onDragEnter={handleModalDragEnter}
          onDragLeave={handleModalDragLeave}
          onDragOver={handleModalDragOver}
          onDrop={handleModalDrop}
        >
          {isModalDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/95 backdrop-blur-xs border-2 border-dashed border-primary text-primary animate-in fade-in-0 duration-150 pointer-events-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-6 w-6 animate-bounce" />
              </div>
              <p className="text-sm font-semibold">{t('dropFilesToAdd')}</p>
            </div>
          )}

          <DialogHeader>
            <DialogTitle>{t('uploadModalTitle')}</DialogTitle>
            <DialogDescription>{t('uploadModalDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1 max-h-60 overflow-y-auto pe-1">
            <div className="flex items-center justify-between pb-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t('filesSelectedCount', { count: stagedFiles.length })}
              </p>
            </div>

            {stagedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background border text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                </div>

                {!isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleRemoveStaged(idx)}
                    aria-label={t('remove')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {!isUploading && (
              <div className="pt-1">
                <input
                  ref={addMoreInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.pptx,.ppt,.key,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="hidden"
                  onChange={handleAddMoreChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addMoreInputRef.current?.click()}
                  className="w-full border-dashed gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('addMoreFiles')}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isUploading}
            >
              {t('uploadCancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isUploading || stagedFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t('uploadingAction')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 me-2" />
                  {t('uploadConfirmAction')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

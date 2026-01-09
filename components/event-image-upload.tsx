"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { uploadFile, shouldContactSupport } from "@/lib/api";

interface EventImageUploadProps {
  onChange: (url: string | null) => void;
  error?: string;
}

export function EventImageUpload({ onChange, error }: EventImageUploadProps) {
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setUploadedFile(file);

    const result = await uploadFile(file);
    if (result.success) {
      onChange(result.data.file);
      toast.success("Image uploaded successfully");
    } else {
      setUploadedFile(null);
      onChange(null);
      if (shouldContactSupport(result.error)) {
        toast.error("Upload failed. Please contact support.");
      } else {
        toast.error(result.error.message);
      }
    }
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>Event Image</Label>
      <FileUpload
        maxFiles={1}
        maxSize={5 * 1024 * 1024}
        accept="image/*"
        onAccept={handleFileUpload}
        value={uploadedFile ? [uploadedFile] : []}
        onValueChange={(files) => {
          if (files.length === 0) {
            handleFileRemove();
          }
        }}
      >
        <FileUploadDropzone className="min-h-30 flex-col">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Drag & drop an image here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Max 5MB, images only
          </p>
        </FileUploadDropzone>
        <FileUploadList>
          {uploadedFile && (
            <FileUploadItem value={uploadedFile}>
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleFileRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </FileUploadItemDelete>
            </FileUploadItem>
          )}
        </FileUploadList>
      </FileUpload>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

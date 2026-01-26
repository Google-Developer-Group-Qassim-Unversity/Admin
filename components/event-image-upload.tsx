"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
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
  getToken?: () => Promise<string | null>;
  /** Initial image URL for edit mode */
  initialValue?: string;
}

export function EventImageUpload({ onChange, error, getToken, initialValue }: EventImageUploadProps) {
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = React.useState<string | null>(initialValue ?? null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Construct full image URL for display
  const imageSource =
    process.env.NEXT_PUBLIC_DEV_IMAGE_SOURCE ||
    process.env.NEXT_PUBLIC_IMAGE_SOURCE;
  const displayImageUrl = existingImageUrl && imageSource ? `${imageSource}${existingImageUrl}` : null;

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    const result = await uploadFile(file, getToken);
    if (result.success) {
      setUploadedFile(file);
      setExistingImageUrl(null); // Clear existing image when new one is uploaded
      onChange(result.data.file);
      toast.success("Image uploaded successfully");
    } else {
      onChange(null);
      if (shouldContactSupport(result.error)) {
        toast.error("Upload failed. Please contact support.");
      } else {
        toast.error(result.error.message);
      }
    }
    setIsUploading(false);
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setExistingImageUrl(null);
    onChange(null);
  };

  const hasImage = uploadedFile || existingImageUrl;

  return (
    <div className="space-y-2">
      <Label>Event Image</Label>
      
      {/* Show existing image preview if no new file uploaded */}
      {existingImageUrl && !uploadedFile && displayImageUrl && (
        <div className="relative rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={displayImageUrl}
                alt="Current event image"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span className="truncate">Current image</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a new image to replace
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleFileRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <FileUpload
        maxFiles={1}
        maxSize={5 * 1024 * 1024}
        accept="image/*"
        onAccept={handleFileUpload}
        value={uploadedFile ? [uploadedFile] : []}
        onValueChange={(files) => {
          if (files.length === 0 && uploadedFile) {
            // Only clear the uploaded file, not the existing image
            setUploadedFile(null);
            // Restore existing image URL if available
            if (existingImageUrl) {
              onChange(existingImageUrl);
            } else {
              onChange(null);
            }
          }
        }}
      >
        {!uploadedFile && !existingImageUrl && (
          <FileUploadDropzone className="min-h-30 flex-col">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Uploading image...
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop an image here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 5MB, images only
                </p>
              </>
            )}
          </FileUploadDropzone>
        )}
        
        {/* Show dropzone for replacement when existing image is present */}
        {existingImageUrl && !uploadedFile && (
          <FileUploadDropzone className="min-h-20 flex-col mt-2">
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Drop new image here or click to browse
                </p>
              </>
            )}
          </FileUploadDropzone>
        )}
        
        <FileUploadList>
          {uploadedFile && (
            <FileUploadItem value={uploadedFile}>
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setUploadedFile(null);
                    // Restore existing image if available
                    if (existingImageUrl) {
                      onChange(existingImageUrl);
                    } else {
                      onChange(null);
                    }
                  }}
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

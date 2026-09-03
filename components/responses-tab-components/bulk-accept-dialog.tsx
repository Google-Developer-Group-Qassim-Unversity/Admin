"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface BulkAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (uniIds: string[]) => void;
  isLoading?: boolean;
}

export function BulkAcceptDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: BulkAcceptDialogProps) {
  const t = useTranslations("responses");
  const tc = useTranslations("common.actions");
  const [uniIdsText, setUniIdsText] = useState("");
  const [dialogKey, setDialogKey] = useState(0);

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing while request is in progress
    if (isLoading && !newOpen) {
      return;
    }
    
    // Reset textarea when dialog opens
    if (newOpen && !open) {
      setUniIdsText("");
      setDialogKey((prev) => prev + 1);
    }
    
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    // Parse Uni IDs from textarea (split by newlines, commas, or spaces)
    const uniIds = uniIdsText
      .split(/[\n,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (uniIds.length === 0) {
      return;
    }

    await onSubmit(uniIds);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={dialogKey}>
        <DialogHeader>
          <DialogTitle>{t("bulkAcceptTitle")}</DialogTitle>
          <DialogDescription>
            {t("bulkAcceptDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="uni-ids">{t("uniIds")}</Label>
          <Textarea
            id="uni-ids"
            placeholder={t("uniIdsPlaceholder")}
            value={uniIdsText}
            onChange={(e) => setUniIdsText(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!uniIdsText.trim() || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("accept")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

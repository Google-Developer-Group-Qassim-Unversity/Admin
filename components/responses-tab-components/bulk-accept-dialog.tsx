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

interface BulkAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (uniIds: string[]) => void;
}

export function BulkAcceptDialog({
  open,
  onOpenChange,
  onSubmit,
}: BulkAcceptDialogProps) {
  const [uniIdsText, setUniIdsText] = useState("");

  const handleSubmit = () => {
    // Parse Uni IDs from textarea (split by newlines, commas, or spaces)
    const uniIds = uniIdsText
      .split(/[\n,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (uniIds.length === 0) {
      return;
    }

    onSubmit(uniIds);
    setUniIdsText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Bulk by Uni ID</DialogTitle>
          <DialogDescription>
            Enter Uni IDs (one per line, or separated by commas). Invalid or
            non-existent IDs will be skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="uni-ids">Uni IDs</Label>
          <Textarea
            id="uni-ids"
            placeholder="Enter Uni IDs here...&#10;Example:&#10;12345&#10;67890&#10;11111"
            value={uniIdsText}
            onChange={(e) => setUniIdsText(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!uniIdsText.trim()}>
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface HtmlPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  subject?: string;
}

export function HtmlPreviewDialog({ open, onOpenChange, html, subject }: HtmlPreviewDialogProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    toast.success("HTML copied to clipboard");
  };

  const handleOpenTab = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit! max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
          {subject && <DialogDescription>{subject}</DialogDescription>}
        </DialogHeader>
        <div className="border rounded-md overflow-hidden bg-muted/30">
          <iframe
            srcDoc={html}
            className="border-0"
            style={{ width: "375px", height: "667px" }}
            sandbox="allow-same-origin"
            title="Email HTML Preview"
          />
        </div>
        <div className="flex items-center gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenTab}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open in new tab
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

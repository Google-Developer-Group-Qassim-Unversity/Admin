"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { ScaledEmailFrame } from "./scaled-email-frame";

interface HtmlPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  subject?: string;
}

export function HtmlPreviewDialog({ open, onOpenChange, html, subject }: HtmlPreviewDialogProps) {
  const t = useTranslations("manageEmails.htmlPreview");
  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    toast.success(t("copied"));
  };

  const handleOpenTab = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-h-[90vh] sm:max-w-[calc(375px+3rem+2px)]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          {subject && <DialogDescription dir="auto">{subject}</DialogDescription>}
        </DialogHeader>
        <div className="border rounded-md overflow-hidden bg-sunk">
          <ScaledEmailFrame srcDoc={html} title={t("title")} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
            {t("copyHtml")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenTab}>
            <ExternalLink className="h-3.5 w-3.5" />
            {t("openNewTab")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

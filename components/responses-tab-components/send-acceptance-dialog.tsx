"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Recipient {
  name: string;
  email: string;
}

interface SendAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  onSubmit: (subject: string, htmlContent: string) => Promise<void>;
  isLoading?: boolean;
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((el) => el.remove());
  doc
    .querySelectorAll("[onclick], [onerror], [onload], [onmouseover]")
    .forEach((el) => {
      el.removeAttribute("onclick");
      el.removeAttribute("onerror");
      el.removeAttribute("onload");
      el.removeAttribute("onmouseover");
    });
  return doc.body.innerHTML;
}

export function SendAcceptanceDialog({
  open,
  onOpenChange,
  recipients,
  onSubmit,
  isLoading = false,
}: SendAcceptanceDialogProps) {
  const [subject, setSubject] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch("/acceptance-template.html");
        if (!res.ok) throw new Error("Failed to load template");
        const html = await res.text();
        setTemplateHtml(html);
        setTemplateLoaded(true);
        setTemplateError(null);
      } catch (err) {
        setTemplateError(
          err instanceof Error ? err.message : "Failed to load template",
        );
      }
    }

    if (open && !templateLoaded) {
      loadTemplate();
    }
  }, [open, templateLoaded]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (isLoading && !newOpen) return;
      if (!newOpen) {
        setSubject("");
        setTemplateHtml("");
        setTemplateLoaded(false);
        setRecipientsOpen(false);
        setDialogKey((prev) => prev + 1);
      }
      onOpenChange(newOpen);
    },
    [isLoading, onOpenChange],
  );

  const handleSubmit = async () => {
    if (!subject.trim()) return;
    if (!iframeRef.current?.contentDocument?.body) return;

    const rawHtml = iframeRef.current.contentDocument.body.innerHTML;
    const cleanHtml = sanitizeHtml(rawHtml);

    await onSubmit(subject.trim(), cleanHtml);
  };

  const recipientCount = recipients.length;
  const isSubmitDisabled = !subject.trim() || isLoading || recipientCount === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        key={dialogKey}
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Send Acceptance Emails</DialogTitle>
          <DialogDescription>
            Send acceptance emails to {recipientCount} recipient
            {recipientCount !== 1 ? "s" : ""}. Edit the email template below
            before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Collapsible open={recipientsOpen} onOpenChange={setRecipientsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
              >
                <span>Recipients ({recipientCount})</span>
                {recipientsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-lg border max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-left py-2 px-3 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((recipient, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">{recipient.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {recipient.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Content</Label>
            {templateError ? (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                {templateError}
              </div>
            ) : (
              <div className="flex justify-center">
                <iframe
                  ref={iframeRef}
                  srcDoc={`
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                      <meta charset="UTF-8">
                      <link rel="preload" as="image" href="https://gdg-q.com/gdg.png" />
                      <style>
                        body { padding: 10px; min-height: 100%; direction: rtl; margin: 0; background-color: #f1f5f; }
                      </style>
                    </head>
                    <body contenteditable="true" style="background-color:#f6f7f8;margin:0">${templateHtml}</body>
                    </html>`
                  }
                  className="border rounded-md"
                  style={{
                    width: "375px",
                    height: "667px",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

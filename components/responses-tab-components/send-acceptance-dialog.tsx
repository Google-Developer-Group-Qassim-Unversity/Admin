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
  doc.querySelectorAll("[onclick], [onerror], [onload], [onmouseover]").forEach((el) => {
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
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    if (open && !templateLoaded) {
      fetch("/acceptance-template.html")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load template");
          return res.text();
        })
        .then((html) => {
          if (contentRef.current) {
            contentRef.current.innerHTML = html;
          }
          setTemplateLoaded(true);
          setTemplateError(null);
        })
        .catch((err) => {
          setTemplateError(err.message);
        });
    }
  }, [open, templateLoaded]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (isLoading && !newOpen) return;
      if (!newOpen) {
        setSubject("");
        setTemplateLoaded(false);
        setRecipientsOpen(false);
        setDialogKey((prev) => prev + 1);
      }
      onOpenChange(newOpen);
    },
    [isLoading, onOpenChange]
  );

  const handleSubmit = async () => {
    if (!subject.trim()) return;
    if (!contentRef.current) return;

    const rawHtml = contentRef.current.innerHTML;
    const cleanHtml = sanitizeHtml(rawHtml);

    await onSubmit(subject.trim(), cleanHtml);
  };

  const recipientCount = recipients.length;
  const isSubmitDisabled = !subject.trim() || isLoading || recipientCount === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={dialogKey} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Acceptance Emails</DialogTitle>
          <DialogDescription>
            Send acceptance emails to {recipientCount} recipient
            {recipientCount !== 1 ? "s" : ""}. Edit the email template below before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Collapsible open={recipientsOpen} onOpenChange={setRecipientsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
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
                        <td className="py-2 px-3 text-muted-foreground">{recipient.email}</td>
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
              <div
                className="border rounded-md overflow-auto"
                style={{
                  width: "375px",
                  height: "667px",
                  maxWidth: "100%",
                }}
              >
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  style={{
                    padding: "40px",
                    direction: "rtl",
                    minHeight: "100%",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
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
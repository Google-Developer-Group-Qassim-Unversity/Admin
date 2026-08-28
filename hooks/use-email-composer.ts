import * as React from "react";

import {
  buildEmailHtml,
  extractTemplateParts,
  sanitizeHtml,
} from "@/app/manage-emails/email-composer-utils";

export type ComposerViewMode = "rendered" | "raw";

interface UseEmailComposerOptions {
  initialBody: string;
  initialStyles: string;
  /**
   * Whether switching from raw HTML back to rendered mode should also pull a
   * `<style>` block out of what was typed and update `styles` with it.
   * Direct email doesn't expose a styles editor, so it leaves `styles` fixed
   * at whatever it was created with; blast lets a template's styles be
   * edited in raw mode, so it tracks them.
   */
  trackStyles?: boolean;
}

/**
 * Owns the compose surface shared by the direct-email and blast tabs: an
 * editable iframe in "rendered" mode, a raw-HTML textarea as the alternate
 * view, and the round-trip between them. Both tabs used to hand-roll this
 * (view-mode state, the iframe srcDoc template, the raw<->rendered
 * extraction) nearly identically.
 *
 * Takes the iframe ref rather than creating it, so the `ref={...}` prop at
 * the call site stays a plain local identifier - handing back a ref object
 * from inside a hook trips the react-hooks/refs lint rule's heuristic for
 * "reading a ref during render", even though nothing here reads `.current`
 * outside an event handler.
 */
export function useEmailComposer(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  { initialBody, initialStyles, trackStyles = false }: UseEmailComposerOptions
) {
  const [bodyContent, setBodyContent] = React.useState(initialBody);
  const [styles, setStyles] = React.useState(initialStyles);
  const [composerKey, setComposerKey] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<ComposerViewMode>("rendered");
  const [rawHtml, setRawHtml] = React.useState("");

  const getCurrentHtml = (): string | null => {
    if (viewMode === "raw") {
      return rawHtml.trim() ? sanitizeHtml(rawHtml) : null;
    }
    if (!iframeRef.current?.contentDocument?.body) return null;
    const currentBody = iframeRef.current.contentDocument.body.innerHTML;
    return sanitizeHtml(buildEmailHtml(styles, currentBody));
  };

  const handleViewModeChange = (mode: ComposerViewMode) => {
    if (mode === viewMode) return;
    if (mode === "raw") {
      const html = getCurrentHtml();
      setRawHtml(html ?? "");
    } else {
      const { styleContent, bodyContent: extracted } = extractTemplateParts(rawHtml);
      setBodyContent(extracted);
      if (trackStyles) {
        setStyles(styleContent);
      }
      setComposerKey((k) => k + 1);
    }
    setViewMode(mode);
  };

  /** Replace the composer's content wholesale (loading a template, or resetting to blank). */
  const loadContent = (body: string, newStyles?: string) => {
    setViewMode("rendered");
    setBodyContent(body);
    if (newStyles !== undefined) {
      setStyles(newStyles);
    }
    setComposerKey((k) => k + 1);
  };

  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>${styles}</style>
      <style>
        body { padding: 10px; min-height: 100%; direction: rtl; margin: 0; background-color: #f1f5f9; }
      </style>
    </head>
    <body contenteditable="true" dir="rtl" style="background-color:#f1f5f9;margin:0">${bodyContent}</body>
    </html>`;

  return {
    viewMode,
    rawHtml,
    setRawHtml,
    bodyContent,
    styles,
    composerKey,
    iframeSrcDoc,
    getCurrentHtml,
    handleViewModeChange,
    setBodyContent,
    setStyles,
    loadContent,
  };
}

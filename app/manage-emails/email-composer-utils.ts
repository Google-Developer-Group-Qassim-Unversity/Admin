import DOMPurify from "dompurify";

/** Sanitize both composed and logged HTML before rendering or sending it. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ["iframe", "object", "embed", "form", "input", "button", "textarea", "select", "base", "meta", "link"],
  });
}

/** A whole address, however it was typed or pasted. */
export const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

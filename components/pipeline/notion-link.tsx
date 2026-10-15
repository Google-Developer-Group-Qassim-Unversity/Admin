"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Mark } from "@/components/najdi";
import type { EventRequestDetail } from "@/lib/pipeline-types";
import { cn } from "@/lib/utils";

/**
 * Notion's mark, drawn in the current colour at Lucide's size. The one
 * non-Lucide icon on the site, because it stands for Notion itself.
 */
export function NotionMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-[18px] shrink-0", className)} fill="currentColor">
      <path d="M4.6 3.4 14.9 2.6c1.3-.1 1.6 0 2.4.6l3.3 2.3c.5.4.7.5.7 1v13.7c0 1-.4 1.6-1.6 1.7l-12 .7c-.9 0-1.4-.1-1.9-.7L3.4 18.7c-.5-.7-.8-1.2-.8-1.9V5c0-.8.4-1.5 2-1.6Zm10.2 1.2L5.6 5.3c-.8.1-1 .6-.6 1l1.6 1.2c.3.2.7.4 1.4.4l9.5-.6c.4 0 .5-.4.2-.6l-1.3-1c-.6-.4-.9-.4-1.6-.4ZM6.1 9.3v9.5c0 .5.3.7.8.7l10.6-.6c.5 0 .6-.3.6-.7V8.8c0-.4-.2-.6-.6-.6L6.8 8.8c-.5 0-.7.3-.7.5Zm10.4.9c.1.3 0 .5-.2.6l-.6.1v8.6c-.5.3-1 .4-1.4.4-.6 0-.8-.2-1.3-.8l-3.9-6.1v5.9l1.2.3s0 .6-.8.6l-2.3.1c-.1-.1 0-.5.2-.5l.6-.2v-7.7l-.8-.1c-.1-.3.1-.7.6-.8l2.4-.2 4 6.2v-5.5l-1-.1c-.1-.4.2-.7.6-.7l2.7-.2Z" />
    </svg>
  );
}

/**
 * "Open in Notion" for the request's card on the design team's board, once it
 * exists. Before that, super admins see that it is pending (and why it failed).
 */
export function NotionLink({ request, isSuperAdmin }: { request: EventRequestDetail; isSuperAdmin: boolean }) {
  const t = useTranslations("pipeline.notion");
  const task = request.tasks.find((x) => x.team === "design");
  if (!task) return null;

  if (task.notion_url) {
    return (
      <a
        href={task.notion_url}
        target="_blank"
        rel="noreferrer"
        title={t("openHint")}
        className="bg-sunk hover:bg-rule focus-visible:outline-ring inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-bold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:h-10"
      >
        <NotionMark className="size-4" />
        {t("open")}
      </a>
    );
  }

  if (!task.notion_pending || !isSuperAdmin) return null;
  return (
    <span
      title={task.notion_error ? t("error", { error: task.notion_error }) : t("pendingHint")}
      className={cn("inline-flex h-7 items-center gap-1.5 text-[13px] font-bold", task.notion_error ? "text-door-madder-ink" : "text-ink-2")}
    >
      {task.notion_error ? <Mark tone="madder" /> : <Loader2 className="size-3.5 animate-spin" />}
      {t("pending")}
    </span>
  );
}

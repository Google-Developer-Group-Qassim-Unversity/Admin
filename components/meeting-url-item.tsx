"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Copy, ExternalLink, Eye, Loader2, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FieldHelp } from "@/components/field-help";
import { Plate } from "@/components/najdi";
import { StatePill } from "@/components/status-badge";
import { useUpdateEventMeetingUrl } from "@/hooks/use-event";
import { resolveEventPhase } from "@/lib/event-lifecycle";
import type { Event, MeetingUrlVisibility } from "@/lib/api-types";

interface MeetingUrlItemProps {
  event: Event;
  requiresRegistration: boolean;
  onEventChange: () => void;
}

/**
 * Online Meeting Link + Visibility Policy (`public` | `accepted` | `hidden`),
 * rendered as two flat operational rows:
 * 1. The meeting URL (read-only once ended or cancelled).
 * 2. Who sees the link (only shown while the event is active/draft and a link exists).
 */
export function MeetingUrlItem({ event, requiresRegistration, onEventChange }: MeetingUrlItemProps) {
  const t = useTranslations("meetingUrlItem");
  const tc = useTranslations("common.states");
  const updateMeetingUrl = useUpdateEventMeetingUrl();

  const savedUrl = event.meeting_url ?? "";
  const defaultVisibility: MeetingUrlVisibility = requiresRegistration ? "accepted" : "public";
  const serverVisibility: MeetingUrlVisibility = event.meeting_url_visibility ?? defaultVisibility;
  const resolvedServerVisibility: MeetingUrlVisibility =
    !requiresRegistration && serverVisibility === "accepted" ? "public" : serverVisibility;

  const [value, setValue] = React.useState(savedUrl);
  const [visibility, setVisibility] = React.useState<MeetingUrlVisibility>(resolvedServerVisibility);

  React.useEffect(() => {
    setValue(savedUrl);
  }, [savedUrl]);

  React.useEffect(() => {
    setVisibility(resolvedServerVisibility);
  }, [resolvedServerVisibility]);

  const phase = resolveEventPhase(event);
  const isInactiveForMembers = event.status === "cancelled" || (event.status === "published" && phase === "ended");
  const trimmed = value.trim();
  const isUrlDirty = trimmed !== savedUrl;
  const hasUrlInput = Boolean(trimmed || savedUrl);

  const save = (nextUrl: string | null, nextVisibility?: MeetingUrlVisibility) => {
    const effectiveVisibility =
      nextVisibility ?? (!requiresRegistration && visibility === "accepted" ? "public" : visibility);

    updateMeetingUrl.mutate(
      {
        id: event.id,
        meetingUrl: nextUrl,
        ...(nextUrl ? { meetingUrlVisibility: effectiveVisibility } : {}),
      },
      {
        onSuccess: () => {
          toast.success(nextUrl ? t("savedToast") : t("removedToast"));
          onEventChange();
        },
        onError: (error) => {
          toast.error(t("saveFailed"), { description: error.message });
        },
      },
    );
  };

  const handleVisibilitySelect = (nextValue: string) => {
    const nextVisibility = nextValue as MeetingUrlVisibility;
    if (nextVisibility === visibility || updateMeetingUrl.isPending) return;
    setVisibility(nextVisibility);

    if (savedUrl && !isUrlDirty) {
      updateMeetingUrl.mutate(
        { id: event.id, meetingUrlVisibility: nextVisibility },
        {
          onSuccess: () => {
            toast.success(t("visibilityUpdatedToast"));
            onEventChange();
          },
          onError: (error) => {
            setVisibility(resolvedServerVisibility);
            toast.error(t("saveFailed"), { description: error.message });
          },
        },
      );
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(savedUrl);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const visibilityOptions = requiresRegistration
    ? [
        { value: "accepted", label: t("visibility.acceptedTitle") },
        { value: "public", label: t("visibility.publicTitle") },
        { value: "hidden", label: t("visibility.hiddenTitle") },
      ]
    : [
        { value: "public", label: t("visibility.publicTitle") },
        { value: "hidden", label: t("visibility.hiddenTitle") },
      ];

  // Ended / cancelled: meeting link is read-only (kept for Meet recording lookup on ended events).
  if (isInactiveForMembers) {
    if (!savedUrl) return null;
    return (
      <div className="border-rule flex min-h-16 flex-col gap-3 border-b px-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex shrink-0 items-center gap-3">
          <Plate tone="neutral" size="sm" icon={Video} />
          <span className="text-[14.5px] font-bold">{t("title")}</span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <span dir="ltr" className="text-ink-2 truncate text-[13.5px] font-medium">
            {savedUrl}
          </span>
          {event.status === "published" && phase === "ended" ? (
            <StatePill tone="neutral">{t("keptForRecordings")}</StatePill>
          ) : null}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={copyLink}
            title={t("copyLink")}
            aria-label={t("copyLink")}
          >
            <Copy />
          </Button>
          <Button variant="outline" size="icon-sm" asChild>
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t("openLink")}
              aria-label={t("openLink")}
            >
              <ExternalLink className="rtl:-scale-x-100" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Row 1: Meeting URL */}
      <div className="border-rule flex min-h-16 flex-col gap-3 border-b px-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex shrink-0 items-center gap-3">
          <Plate tone="neutral" size="sm" icon={Video} />
          <span className="text-[14.5px] font-bold">{t("title")}</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-lg sm:justify-end">
          <Input
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            dir="ltr"
            placeholder={t("placeholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isUrlDirty) {
                save(trimmed || null);
              }
            }}
            disabled={updateMeetingUrl.isPending}
            aria-label={t("ariaLabel")}
            className="min-w-0 flex-1 text-ellipsis"
          />
          <Button
            size="sm"
            onClick={() => save(trimmed || null)}
            disabled={!isUrlDirty || updateMeetingUrl.isPending}
          >
            {updateMeetingUrl.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {tc("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
          {savedUrl ? (
            <>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={copyLink}
                title={t("copyLink")}
                aria-label={t("copyLink")}
              >
                <Copy />
              </Button>
              <Button variant="outline" size="icon-sm" asChild>
                <a
                  href={savedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("openLink")}
                  aria-label={t("openLink")}
                >
                  <ExternalLink className="rtl:-scale-x-100" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                title={t("removeLink")}
                aria-label={t("removeLink")}
                onClick={() => save(null)}
                disabled={updateMeetingUrl.isPending}
              >
                <Trash2 />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Row 2: Who sees the link (clear dedicated label + FieldHelp) */}
      {hasUrlInput ? (
        <div className="border-rule flex min-h-16 flex-col gap-3 border-b px-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex shrink-0 items-center gap-2">
            <Plate tone="neutral" size="sm" icon={Eye} />
            <span className="ms-1 text-[14.5px] font-bold">{t("visibilityLabel")}</span>
            <FieldHelp label={t("visibilityHelpLabel")}>{t("visibilityHelp")}</FieldHelp>
            {updateMeetingUrl.isPending ? (
              <Loader2 className="text-ink-2 size-4 animate-spin" aria-hidden="true" />
            ) : null}
          </div>

          <div className="w-full sm:w-auto sm:min-w-72">
            <SegmentedControl
              label={t("visibilityLabel")}
              value={visibility}
              onValueChange={handleVisibilitySelect}
              disabled={updateMeetingUrl.isPending}
              options={visibilityOptions}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, EyeOff, Globe, Loader2, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mortar } from "@/components/najdi";
import { useUpdateEventMeetingUrl } from "@/hooks/use-event";
import { resolveEventPhase } from "@/lib/event-lifecycle";
import type { Event, MeetingUrlVisibility } from "@/lib/api-types";

interface MeetingUrlItemProps {
  event: Event;
  requiresRegistration: boolean;
  onEventChange: () => void;
}

/**
 * Online Meeting Link + Visibility Policy (`public` | `accepted` | `hidden`).
 *
 * Designed for smart defaults & progressive disclosure:
 * - Before a link is entered/saved, only the clean single URL input is shown.
 * - Once a link exists (or is being typed), the compact visibility selector appears
 *   with the smart default already selected (`accepted` when registration is required,
 *   `public` when open attendance) — and hides the `accepted` option completely when
 *   registration is off so newcomers never face nonsensical combinations.
 * - After the event ends or is cancelled, hides member visibility controls and explains
 *   that the link stays available for Google Meet recording lookup.
 */
export function MeetingUrlItem({ event, requiresRegistration, onEventChange }: MeetingUrlItemProps) {
  const t = useTranslations("meetingUrlItem");
  const tc = useTranslations("common.states");
  const updateMeetingUrl = useUpdateEventMeetingUrl();

  const savedUrl = event.meeting_url ?? "";
  const defaultVisibility: MeetingUrlVisibility = requiresRegistration ? "accepted" : "public";
  const serverVisibility: MeetingUrlVisibility =
    event.meeting_url_visibility ?? defaultVisibility;
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

  const handleVisibilitySelect = (nextVisibility: MeetingUrlVisibility) => {
    if (nextVisibility === visibility || updateMeetingUrl.isPending) return;
    setVisibility(nextVisibility);

    // If a link is already saved and not being edited, persist the policy immediately.
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

  const visibilityOptions: Array<{
    value: MeetingUrlVisibility;
    title: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = requiresRegistration
    ? [
        {
          value: "accepted",
          title: t("visibility.acceptedTitle"),
          hint: t("visibility.acceptedHint"),
          icon: UserCheck,
        },
        {
          value: "public",
          title: t("visibility.publicTitle"),
          hint: t("visibility.publicHint"),
          icon: Globe,
        },
        {
          value: "hidden",
          title: t("visibility.hiddenTitle"),
          hint: t("visibility.hiddenHint"),
          icon: EyeOff,
        },
      ]
    : [
        {
          value: "public",
          title: t("visibility.publicTitle"),
          hint: t("visibility.publicHint"),
          icon: Globe,
        },
        {
          value: "hidden",
          title: t("visibility.hiddenTitle"),
          hint: t("visibility.hiddenHint"),
          icon: EyeOff,
        },
      ];

  const descriptionText = isInactiveForMembers
    ? t("descriptionEnded")
    : savedUrl
      ? t(`descriptionByVisibility.${resolvedServerVisibility}`)
      : t("descriptionEmpty");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-ink-2 text-[13px]">{descriptionText}</p>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
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
            className="w-full min-w-0 text-ellipsis sm:flex-1"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 sm:flex-none"
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
                  size="icon"
                  onClick={copyLink}
                  title={t("copyLink")}
                  aria-label={t("copyLink")}
                >
                  <Copy className="size-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={savedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("openLink")}
                    aria-label={t("openLink")}
                  >
                    <ExternalLink className="size-4 rtl:-scale-x-100" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title={t("removeLink")}
                  aria-label={t("removeLink")}
                  onClick={() => save(null)}
                  disabled={updateMeetingUrl.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Progressive disclosure: only show visibility policy once a link exists (or is typed) and event is not ended/cancelled */}
      {hasUrlInput && !isInactiveForMembers ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span id="meeting-visibility-label" className="text-ink-2 text-[13px] font-bold">
              {t("visibilityLabel")}
            </span>
            {updateMeetingUrl.isPending ? (
              <Loader2 className="text-ink-2 size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
          </div>

          <Mortar
            role="radiogroup"
            aria-labelledby="meeting-visibility-label"
            className={requiresRegistration ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}
          >
            {visibilityOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={updateMeetingUrl.isPending}
                  onClick={() => handleVisibilitySelect(opt.value)}
                  className={`focus-visible:outline-ring flex min-h-14 items-start gap-2.5 rounded-lg p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
                    selected
                      ? "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
                      : "text-ink-2 hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13.5px] font-bold">{opt.title}</span>
                    <span className="text-ink-2 text-[12px] leading-snug">{opt.hint}</span>
                  </span>
                  {selected ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </Mortar>
        </div>
      ) : null}
    </div>
  );
}

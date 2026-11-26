"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Ban,
  Clock,
  FileEdit,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUpdateEventRegistration } from "@/hooks/use-event";
import { resolveEffectiveRegistration, resolveEventPhase } from "@/lib/event-lifecycle";
import type { Event, GoogleFormData, RegistrationStatus } from "@/lib/api-types";

interface EventRegistrationControlsProps {
  event: Event;
  formData: GoogleFormData | null;
  onChanged: () => void;
}

/**
 * Registration open/closed gate inside Section 2 of `/events/[id]/manage`.
 * Plain manual open/closed control — no scheduling UI.
 */
export function EventRegistrationControls({ event, formData, onChanged }: EventRegistrationControlsProps) {
  const t = useTranslations("eventManage.registration");
  const updateRegistration = useUpdateEventRegistration();

  const effective = formData?.effectiveRegistrationStatus ?? resolveEffectiveRegistration(event);
  const phase = resolveEventPhase(event);

  const isDraft = event.status === "draft";
  const isCancelled = event.status === "cancelled";
  const isPublishedEnded = event.status === "published" && phase === "ended";
  const isPublishedActive = event.status === "published" && phase !== "ended";

  const handleQuickStatus = async (target: RegistrationStatus) => {
    try {
      await updateRegistration.mutateAsync({
        id: event.id,
        data: { registration_status: target },
      });
      toast.success(target === "open" ? t("openedToast") : t("closedToast"));
      onChanged();
    } catch (error) {
      toast.error(t("updateFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const gate = React.useMemo(() => {
    if (isCancelled) {
      return {
        surface: "bg-sunk/60 ring-rule text-ink-2",
        icon: Ban,
        iconClass: "text-door-madder-ink",
        title: t("gateCancelledTitle"),
        body: t("explainCancelled"),
      };
    }
    if (isDraft) {
      return {
        surface: "bg-sunk/60 ring-rule text-foreground",
        icon: FileEdit,
        iconClass: "text-door-umber-ink",
        title: t("gateDraftTitle"),
        body: t("explainDraft"),
      };
    }
    if (isPublishedEnded) {
      return {
        surface: "bg-sunk/60 ring-rule text-foreground",
        icon: Lock,
        iconClass: "text-ink-2",
        title: t("gateEndedTitle"),
        body: t("explainEnded"),
      };
    }
    if (effective === "open") {
      return {
        surface: "bg-door-green-soft ring-door-green/30 text-door-green-ink",
        icon: Unlock,
        iconClass: "text-door-green-ink",
        title: t("gateOpenTitle"),
        body: t("explainOpen"),
      };
    }
    if (effective === "not_open") {
      return {
        surface: "bg-door-ochre-soft ring-door-ochre/35 text-door-ochre-ink",
        icon: Clock,
        iconClass: "text-door-ochre-ink",
        title: t("gateNotOpenTitle"),
        body: t("explainNotOpen"),
      };
    }
    return {
      surface: "bg-sunk/60 ring-rule text-foreground",
      icon: Lock,
      iconClass: "text-ink-2",
      title: t("gateClosedTitle"),
      body: t("explainClosedManual"),
    };
  }, [isCancelled, isDraft, isPublishedEnded, effective, t]);

  const GateIcon = gate.icon;

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg p-3.5 ring-1 sm:flex-row sm:items-center sm:justify-between ${gate.surface}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <GateIcon className={`mt-0.5 size-4 shrink-0 ${gate.iconClass}`} aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-bold">{gate.title}</p>
          <p className="text-[13px] opacity-90">
            {gate.body}
            {isPublishedEnded ? (
              <>
                {" "}
                <Link
                  href={`/events/${event.id}/edit`}
                  className="text-foreground font-medium underline underline-offset-2"
                >
                  {t("editDates")}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {isPublishedActive ? (
        <div className="flex w-full shrink-0 sm:w-auto">
          {effective === "open" ? (
            <Button
              variant="outline"
              size="sm"
              className="bg-card w-full sm:w-auto"
              disabled={updateRegistration.isPending}
              onClick={() => handleQuickStatus("closed")}
            >
              {updateRegistration.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("updating")}
                </>
              ) : (
                <>
                  <Lock />
                  {t("closeNow")}
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="green"
              size="sm"
              className="w-full sm:w-auto"
              disabled={updateRegistration.isPending}
              onClick={() => handleQuickStatus("open")}
            >
              {updateRegistration.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("updating")}
                </>
              ) : (
                <>
                  <Unlock />
                  {t("openRegistration")}
                </>
              )}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

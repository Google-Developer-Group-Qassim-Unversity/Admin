"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  ClipboardCheck,
  Ellipsis,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Lock,
  RotateCcw,
  Undo2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RegistrationBadge, StatusBadge } from "@/components/status-badge";
import { Door, DoorPanel, Plate, type DoorTone } from "@/components/najdi";
import {
  useCancelEvent,
  usePublishEvent,
  useUnpublishEvent,
  useUpdateEventRegistration,
} from "@/hooks/use-event";
import { resolveEffectiveRegistration, resolveEventPhase } from "@/lib/event-lifecycle";
import { useFormatters } from "@/lib/format";
import { config } from "@/lib/config";
import type { Event, GoogleFormData, RegistrationStatus } from "@/lib/api-types";

interface PublishItemProps {
  event: Event;
  formData: GoogleFormData | null;
  onEventChange: () => void;
}

const STEP_RING: Record<DoorTone, string> = {
  green: "bg-door-green text-on-door ring-2 ring-door-green ring-offset-2 ring-offset-background",
  ochre: "bg-door-ochre text-on-door-ochre ring-2 ring-door-ochre ring-offset-2 ring-offset-background",
  madder: "bg-door-madder text-on-door ring-2 ring-door-madder ring-offset-2 ring-offset-background",
  indigo: "bg-door-indigo text-on-door ring-2 ring-door-indigo ring-offset-2 ring-offset-background",
  umber: "bg-door-umber text-on-door ring-2 ring-door-umber ring-offset-2 ring-offset-background",
};

type StepKey = "draft" | "published" | "live" | "ended";

const STEPS: StepKey[] = ["draft", "published", "live", "ended"];

/**
 * Top lifecycle region of `/events/[id]/manage`:
 * 1. Four-step chronological track (`draft` -> `published` -> `live` -> `ended`),
 *    with the current registration badge sitting under `published`.
 * 2. One painted `Door` carrying the current status, a single primary action
 *    (publish, open/close registration, attendance, or restore), and an overflow
 *    menu for secondary moves (`publish without registration`, `move to draft`, `cancel`).
 */
export function PublishItem({ event, formData, onEventChange }: PublishItemProps) {
  const t = useTranslations("publishItem");
  const tm = useTranslations("eventManage");
  const tr = useTranslations("eventManage.registration");
  const tc = useTranslations("common.actions");
  const fmt = useFormatters();

  const publishEvent = usePublishEvent();
  const unpublishEvent = useUnpublishEvent();
  const cancelEvent = useCancelEvent();
  const updateRegistration = useUpdateEventRegistration();

  const [pendingAction, setPendingAction] = React.useState<
    "publishOpen" | "publishOnly" | "unpublish" | "cancel" | "restorePublish" | "restoreDraft" | "reg" | null
  >(null);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const isBusy =
    publishEvent.isPending ||
    unpublishEvent.isPending ||
    cancelEvent.isPending ||
    updateRegistration.isPending;

  const requiresRegistration = (formData?.formType ?? event.form_type ?? "registration") !== "none";
  const phase = resolveEventPhase(event);
  const effectiveReg = formData?.effectiveRegistrationStatus ?? resolveEffectiveRegistration(event);
  const eventUrl = `${config.memberAppUrl}/events/${event.id}`;

  const handlePublish = async (openRegistration?: boolean) => {
    const actionKey =
      openRegistration === true
        ? "publishOpen"
        : event.status === "cancelled"
          ? "restorePublish"
          : "publishOnly";
    setPendingAction(actionKey);
    try {
      await publishEvent.mutateAsync({ id: event.id, openRegistration });
      toast.success(
        event.status === "cancelled"
          ? t("restoredPublishedSuccess")
          : openRegistration === true
            ? t("publishedAndOpenedSuccess")
            : t("publishedSuccess"),
      );
      onEventChange();
    } catch (error) {
      toast.error(t("publishFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnpublish = async () => {
    const actionKey = event.status === "cancelled" ? "restoreDraft" : "unpublish";
    setPendingAction(actionKey);
    try {
      await unpublishEvent.mutateAsync(event.id);
      toast.success(event.status === "cancelled" ? t("restoredDraftSuccess") : t("unpublishedSuccess"));
      setUnpublishDialogOpen(false);
      onEventChange();
    } catch (error) {
      toast.error(t("unpublishFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleCancel = async () => {
    setPendingAction("cancel");
    try {
      await cancelEvent.mutateAsync(event.id);
      toast.success(t("cancelledSuccess"));
      setCancelDialogOpen(false);
      onEventChange();
    } catch (error) {
      toast.error(t("cancelFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRegistrationStatus = async (target: RegistrationStatus) => {
    setPendingAction("reg");
    try {
      await updateRegistration.mutateAsync({
        id: event.id,
        data: { registration_status: target },
      });
      toast.success(target === "open" ? tr("openedToast") : tr("closedToast"));
      onEventChange();
    } catch (error) {
      toast.error(tr("updateFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPendingAction(null);
    }
  };

  // Determine step position and Door tone/copy
  let currentStep = 0;
  let doorTone: DoorTone = "ochre";
  let doorTitle = t("draftTitle");
  let doorSubtitle = t("draftDescription");
  let doorStamp: string | null = null;

  if (event.status === "cancelled") {
    currentStep = -1;
    doorTone = "madder";
    doorTitle = t("cancelledTitle");
    doorSubtitle = t("cancelledDescription");
    doorStamp = event.cancelled_at ? t("cancelledAt", { date: fmt.dateTime(event.cancelled_at) }) : null;
  } else if (event.status === "draft") {
    currentStep = 0;
    doorTone = "ochre";
    doorTitle = t("draftTitle");
    doorSubtitle = t("draftDescription");
  } else if (phase === "ended") {
    currentStep = 3;
    doorTone = "umber";
    doorTitle = t("endedTitle");
    doorSubtitle = t("endedSubtitle");
    doorStamp = event.published_at ? t("publishedAt", { date: fmt.dateTime(event.published_at) }) : null;
  } else if (phase === "live") {
    currentStep = 2;
    doorTone = "green";
    doorTitle = t("liveTitle");
    doorSubtitle = !requiresRegistration
      ? t("liveFreeSubtitle")
      : effectiveReg === "open"
        ? t("liveOpenSubtitle")
        : t("liveClosedSubtitle");
    doorStamp = event.published_at ? t("publishedAt", { date: fmt.dateTime(event.published_at) }) : null;
  } else {
    currentStep = 1;
    doorStamp = event.published_at ? t("publishedAt", { date: fmt.dateTime(event.published_at) }) : null;
    if (!requiresRegistration) {
      doorTone = "green";
      doorTitle = t("publishedFreeTitle");
      doorSubtitle = t("publishedFreeSubtitle");
    } else if (effectiveReg === "open") {
      doorTone = "green";
      doorTitle = t("publishedOpenTitle");
      doorSubtitle = t("publishedOpenSubtitle");
    } else if (effectiveReg === "not_open") {
      doorTone = "ochre";
      doorTitle = t("publishedNotOpenTitle");
      doorSubtitle = t("publishedNotOpenSubtitle");
    } else {
      doorTone = "umber";
      doorTitle = t("publishedClosedTitle");
      doorSubtitle = t("publishedClosedSubtitle");
    }
  }

  const isDraftPastDate = event.status === "draft" && phase === "ended";
  const showOverflowMenu =
    (event.status === "draft" && requiresRegistration) || event.status === "published";

  const renderPrimaryAction = () => {
    if (event.status === "cancelled") {
      return (
        <>
          <Button
            variant="green"
            className="flex-1 sm:flex-none"
            disabled={isBusy}
            onClick={() => handlePublish()}
          >
            {pendingAction === "restorePublish" ? (
              <>
                <Loader2 className="animate-spin" />
                {t("restoring")}
              </>
            ) : (
              <>
                <RotateCcw />
                {t("restoreAndPublish")}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="bg-card flex-1 sm:flex-none"
            disabled={isBusy}
            onClick={handleUnpublish}
          >
            {pendingAction === "restoreDraft" ? (
              <>
                <Loader2 className="animate-spin" />
                {t("restoring")}
              </>
            ) : (
              <>
                <Undo2 />
                {t("restoreAsDraft")}
              </>
            )}
          </Button>
        </>
      );
    }

    if (event.status === "draft") {
      return (
        <Button
          variant="green"
          className="flex-1 sm:flex-none"
          disabled={isBusy}
          onClick={() => handlePublish(requiresRegistration ? true : undefined)}
        >
          {pendingAction === "publishOpen" || pendingAction === "publishOnly" ? (
            <>
              <Loader2 className="animate-spin" />
              {t("publishing")}
            </>
          ) : (
            <>
              <Globe />
              {requiresRegistration ? t("publishAndOpen") : t("publishEvent")}
            </>
          )}
        </Button>
      );
    }

    if (phase === "ended") {
      return (
        <Button asChild className="flex-1 sm:flex-none">
          <Link href={`/events/${event.id}/edit`}>
            <Calendar />
            {t("editDates")}
          </Link>
        </Button>
      );
    }

    if (phase === "live") {
      return (
        <Button asChild className="flex-1 sm:flex-none">
          <Link href={`/events/${event.id}/attendance`}>
            <ClipboardCheck />
            {t("openAttendance")}
          </Link>
        </Button>
      );
    }

    if (!requiresRegistration) {
      return (
        <Button asChild className="flex-1 sm:flex-none">
          <a href={eventUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="rtl:-scale-x-100" />
            {t("openPublicPage")}
          </a>
        </Button>
      );
    }

    if (effectiveReg === "open") {
      return (
        <Button
          className="flex-1 sm:flex-none"
          disabled={isBusy}
          onClick={() => handleRegistrationStatus("closed")}
        >
          {pendingAction === "reg" ? (
            <>
              <Loader2 className="animate-spin" />
              {tr("updating")}
            </>
          ) : (
            <>
              <Lock />
              {tr("closeNow")}
            </>
          )}
        </Button>
      );
    }

    return (
      <Button
        variant={effectiveReg === "not_open" ? "green" : "default"}
        className="flex-1 sm:flex-none"
        disabled={isBusy}
        onClick={() => handleRegistrationStatus("open")}
      >
        {pendingAction === "reg" ? (
          <>
            <Loader2 className="animate-spin" />
            {tr("updating")}
          </>
        ) : (
          <>
            <Unlock />
            {effectiveReg === "not_open" ? tr("openRegistration") : tr("reopenRegistration")}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 4-step chronological lifecycle track */}
      <div className="bg-card ring-rule rounded-xl px-4 py-3.5 ring-1 sm:px-5 sm:py-4">
        {event.status === "cancelled" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Plate tone="madder" size="sm" icon={Ban} />
              <span className="text-sm font-bold">{tm("steps.cancelledTitle")}</span>
            </div>
            <StatusBadge event={event} />
          </div>
        ) : (
          <ol
            aria-label={tm("steps.label")}
            className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-0"
          >
            {STEPS.map((step, index) => {
              const isDone = index < currentStep;
              const isCurrent = index === currentStep;
              const isLast = index === STEPS.length - 1;
              return (
                <li
                  key={step}
                  aria-current={isCurrent ? "step" : undefined}
                  className="relative flex items-center gap-2.5 sm:flex-col sm:gap-1.5 sm:px-1.5 sm:text-center"
                >
                  {/* Connecting rail: horizontal on sm+, vertical on phone */}
                  {!isLast ? (
                    <>
                      <span
                        aria-hidden="true"
                        className={`hidden h-0.5 sm:block sm:absolute sm:top-[13px] sm:start-[calc(50%+16px)] sm:w-[calc(100%-32px)] ${
                          isDone ? "bg-door-green" : "bg-rule"
                        }`}
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute start-[13px] top-7 h-[calc(100%-12px)] w-0.5 sm:hidden ${
                          isDone ? "bg-door-green" : "bg-rule"
                        }`}
                      />
                    </>
                  ) : null}

                  <span
                    aria-hidden="true"
                    className={`tabular relative z-10 grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold ${
                      isDone
                        ? "bg-door-green text-on-door"
                        : isCurrent
                          ? STEP_RING[doorTone]
                          : "bg-sunk text-ink-3 shadow-[inset_0_0_0_1px_var(--rule)]"
                    }`}
                  >
                    {isDone ? <Check className="size-3.5" strokeWidth={2.25} /> : index + 1}
                  </span>

                  <span
                    className={`text-[13.5px] leading-tight ${
                      isCurrent
                        ? "text-foreground font-bold"
                        : isDone
                          ? "text-ink-2 font-medium"
                          : "text-ink-3 font-medium"
                    }`}
                  >
                    {tm(`steps.${step}`)}
                  </span>

                  {step === "published" && event.status === "published" && phase === "upcoming" ? (
                    <span className="ms-auto sm:ms-0">
                      <RegistrationBadge event={event} status={effectiveReg} variant="pill" />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Single painted Door: status + one primary next move + overflow */}
      <Door tone={doorTone} aria-labelledby="manage-publication">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 id="manage-publication" className="font-display text-[21px] leading-snug font-semibold">
              {doorTitle}
            </h2>
            <p className="text-sm font-medium opacity-90">{doorSubtitle}</p>
          </div>
          {doorStamp ? <span className="tabular text-xs font-medium opacity-80">{doorStamp}</span> : null}
        </div>

        <DoorPanel className="gap-3 p-3.5">
          {isDraftPastDate ? (
            <div className="bg-door-madder-soft text-door-madder-ink flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{t("draftPastDateWarning", { date: fmt.dateTime(event.end_datetime) })}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" asChild>
                <Link href={`/events/${event.id}/edit`}>{t("editDates")}</Link>
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {renderPrimaryAction()}

            {showOverflowMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isBusy}
                    aria-label={t("moreActions")}
                    title={t("moreActions")}
                    className="bg-card shrink-0"
                  >
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {event.status === "draft" && requiresRegistration ? (
                    <DropdownMenuItem onClick={() => handlePublish(false)}>
                      <Eye />
                      {t("publishOnly")}
                    </DropdownMenuItem>
                  ) : null}

                  {event.status === "published" && phase === "live" && requiresRegistration ? (
                    <DropdownMenuItem
                      onClick={() => handleRegistrationStatus(effectiveReg === "open" ? "closed" : "open")}
                    >
                      {effectiveReg === "open" ? <Lock /> : <Unlock />}
                      {effectiveReg === "open" ? tr("closeNow") : tr("openRegistration")}
                    </DropdownMenuItem>
                  ) : null}

                  {event.status === "published" ? (
                    <>
                      <DropdownMenuItem onClick={() => setUnpublishDialogOpen(true)}>
                        <Undo2 />
                        {t("moveToDraft")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setCancelDialogOpen(true)}>
                        <Ban />
                        {t("cancelEvent")}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </DoorPanel>
      </Door>

      {/* Confirm unpublish (move back to draft) */}
      <AlertDialog
        open={unpublishDialogOpen}
        onOpenChange={(open) => {
          if (!unpublishEvent.isPending) setUnpublishDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unpublishConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("unpublishConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpublishEvent.isPending}>{tc("cancel")}</AlertDialogCancel>
            <Button onClick={handleUnpublish} disabled={unpublishEvent.isPending}>
              {unpublishEvent.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("unpublishing")}
                </>
              ) : (
                <>
                  <Undo2 />
                  {t("moveToDraft")}
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm cancel event */}
      <AlertDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          if (!cancelEvent.isPending) setCancelDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{t("cancelConfirmIntro")}</p>
                <ul className="list-disc space-y-1 ps-5">
                  <li>{t("cancelConsequenceRegistration")}</li>
                  <li>{t("cancelConsequenceNotify")}</li>
                  <li>{t("cancelConsequencePoints")}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelEvent.isPending}>{tc("cancel")}</AlertDialogCancel>
            <Button variant="madder" onClick={handleCancel} disabled={cancelEvent.isPending}>
              {cancelEvent.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("cancelling")}
                </>
              ) : (
                <>
                  <Ban />
                  {t("cancelConfirmButton")}
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

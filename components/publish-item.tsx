"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Ban,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  QrCode,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { EventQrCodeDialog } from "@/components/event-qr-code-dialog";
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
import { StatusBadge } from "@/components/status-badge";
import { Door, DoorPanel, Plate, SectionHead } from "@/components/najdi";
import { useCancelEvent, usePublishEvent, useUnpublishEvent } from "@/hooks/use-event";
import { resolveEventPhase } from "@/lib/event-lifecycle";
import { useFormatters } from "@/lib/format";
import { config } from "@/lib/config";
import type { Event, GoogleFormData } from "@/lib/api-types";

interface PublishItemProps {
  event: Event;
  formData: GoogleFormData | null;
  onEventChange: () => void;
}

/**
 * Region 1 of `/events/[id]/manage`: Event Visibility, Publication & Permanent Share Link.
 *
 * - Draft: Mud & Doors ochre `Door` with past-date safeguard, atomic Publish & Open /
 *   Publish Preview actions, and the permanent event link + QR ready for posters before publish.
 * - Published: calm plaster panel with live phase state, the exact same share strip (now live
 *   with Open), always-available Unpublish (Move to Draft), and Cancel Event.
 * - Cancelled: calm plaster panel with madder status banner and Restore actions.
 */
export function PublishItem({ event, formData, onEventChange }: PublishItemProps) {
  const t = useTranslations("publishItem");
  const tc = useTranslations("common.actions");
  const fmt = useFormatters();

  const publishEvent = usePublishEvent();
  const unpublishEvent = useUnpublishEvent();
  const cancelEvent = useCancelEvent();

  const [pendingAction, setPendingAction] = React.useState<
    "publishOpen" | "publishOnly" | "unpublish" | "cancel" | "restorePublish" | "restoreDraft" | null
  >(null);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const isBusy = publishEvent.isPending || unpublishEvent.isPending || cancelEvent.isPending;
  const requiresRegistration = (formData?.formType ?? event.form_type ?? "registration") !== "none";
  const hasGoogleForm = Boolean(formData?.googleFormId);
  const phase = resolveEventPhase(event);
  const eventUrl = `${config.memberAppUrl}/events/${event.id}`;
  const displayUrl = eventUrl.replace(/^https?:\/\//, "");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

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

  const shareStrip = (mode: "draft" | "published") => (
    <div className="bg-sunk/60 ring-rule flex flex-col gap-2.5 rounded-lg p-3 ring-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <Link2 className="text-ink-2 mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-ink-2 text-[12px] font-bold">{t("eventLink")}</span>
            {mode === "draft" ? (
              <span className="text-ink-3 text-[12px]">{t("draftLinkHint")}</span>
            ) : null}
          </div>
          <span dir="ltr" className="tabular truncate text-start text-sm font-medium">
            {displayUrl}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleCopyLink}>
          <Copy />
          {t("copyLink")}
        </Button>
        <EventQrCodeDialog
          url={eventUrl}
          eventName={event.name}
          trigger={
            <Button variant="outline" size="icon-sm" title={t("showQr")} aria-label={t("showQr")}>
              <QrCode />
            </Button>
          }
        />
        {mode === "published" ? (
          <Button variant="outline" size="icon-sm" asChild>
            <a
              href={eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t("openEvent")}
              aria-label={t("openEvent")}
            >
              <ExternalLink className="rtl:-scale-x-100" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );

  // ── Draft: Mud & Doors ochre Door (the one action waiting on the admin) ──
  if (event.status === "draft") {
    const isPastDate = phase === "ended";
    return (
      <Door tone="ochre" aria-labelledby="manage-publication">
        <div className="flex flex-col gap-1">
          <h2 id="manage-publication" className="font-display text-[21px] leading-snug font-semibold">
            {t("draftTitle")}
          </h2>
          <p className="text-sm opacity-90">{t("draftDescription")}</p>
        </div>

        <DoorPanel className="gap-4 p-4">
          {isPastDate ? (
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

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {requiresRegistration ? (
              <>
                <Button
                  variant="green"
                  className="w-full sm:w-auto"
                  disabled={isBusy}
                  onClick={() => handlePublish(true)}
                >
                  {pendingAction === "publishOpen" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {t("publishing")}
                    </>
                  ) : (
                    <>
                      <Globe />
                      {t("publishAndOpen")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={isBusy}
                  onClick={() => handlePublish(false)}
                >
                  {pendingAction === "publishOnly" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {t("publishing")}
                    </>
                  ) : (
                    t("publishOnly")
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="green"
                className="w-full sm:w-auto"
                disabled={isBusy}
                onClick={() => handlePublish()}
              >
                {pendingAction === "publishOnly" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("publishing")}
                  </>
                ) : (
                  <>
                    <Globe />
                    {t("publishEvent")}
                  </>
                )}
              </Button>
            )}
          </div>

          {requiresRegistration ? (
            <p className="text-ink-2 text-[13px]">
              {t("publishOnlyHint")}
              {hasGoogleForm ? ` ${t("googleFormDraftNote")}` : ""}
            </p>
          ) : null}

          {/* Permanent URL + QR available BEFORE publishing for posters & social prep */}
          <div className="border-rule border-t pt-3.5">{shareStrip("draft")}</div>
        </DoorPanel>
      </Door>
    );
  }

  // ── Cancelled: plaster panel with madder state callout + recovery actions ──
  if (event.status === "cancelled") {
    return (
      <section aria-labelledby="manage-publication" className="panel flex flex-col gap-4">
        <SectionHead
          id="manage-publication"
          title={t("sectionTitle")}
          as="h2"
          action={<StatusBadge event={event} />}
        />

        <div className="bg-door-madder-soft text-door-madder-ink flex items-start gap-3 rounded-lg p-3.5">
          <Ban className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-[15px] font-bold">{t("cancelledTitle")}</h3>
            <p className="text-sm opacity-90">{t("cancelledDescription")}</p>
            {event.cancelled_at ? (
              <p className="tabular text-[13px] opacity-80">
                {t("cancelledAt", { date: fmt.dateTime(event.cancelled_at) })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            variant="green"
            className="w-full sm:w-auto"
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
            className="w-full sm:w-auto"
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
        </div>
      </section>
    );
  }

  // ── Published (upcoming / live / ended): calm plaster panel ──
  return (
    <>
      <section aria-labelledby="manage-publication" className="panel flex flex-col gap-4">
        <SectionHead
          id="manage-publication"
          title={t("sectionTitle")}
          as="h2"
          action={<StatusBadge event={event} />}
        />

        <div className="flex items-start gap-3">
          <Plate tone={phase === "live" ? "green" : phase === "upcoming" ? "indigo" : "umber"} icon={Globe} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-[15px] font-bold">{t("publishedTitle")}</h3>
            <p className="text-ink-2 text-sm">
              {t(`publishedPhaseHint.${phase}`)}
              {phase === "ended" ? (
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
            {event.published_at ? (
              <p className="text-ink-3 tabular text-[13px]">
                {t("publishedAt", { date: fmt.dateTime(event.published_at) })}
              </p>
            ) : null}
          </div>
        </div>

        {/* Same permanent share strip, now live with Open link */}
        {shareStrip("published")}

        {/* Always allow undoing publish (Move to Draft) separately from Cancel Event */}
        <div className="border-rule flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={isBusy}
            onClick={() => setUnpublishDialogOpen(true)}
          >
            <Undo2 />
            {t("moveToDraft")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
            disabled={isBusy}
            onClick={() => setCancelDialogOpen(true)}
          >
            <Ban />
            {t("cancelEvent")}
          </Button>
        </div>
      </section>

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
    </>
  );
}

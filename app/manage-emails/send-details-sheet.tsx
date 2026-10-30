"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Copy, Loader2, Paperclip, RotateCw, Search, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { Fact, Plate, RowsSkeleton, SectionHead } from "@/components/najdi";
import { StatePill } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAccess } from "@/hooks/use-access";
import { isSending, useRetryCertificates, useSend } from "@/hooks/use-email-sends";
import { errorMessage } from "@/lib/api/errors";
import type { SendDetail } from "@/lib/api-types";
import { isolate, useFormatters } from "@/lib/format";
import { normalizeArabic } from "@/lib/search-utils";

import { ScaledEmailFrame } from "./scaled-email-frame";
import { KIND_ICON, SendProgress, SendStatusPill, canReuse, isCertificate, useKindLabel, useSendTitle } from "./send-bits";

/** Recipients shown before "show all": enough for a check, light enough for a 2,000-person campaign. */
const FIRST_RECIPIENTS = 100;

/**
 * One send, opened from the outbox: who it went to, who it failed for and why,
 * and the email itself. Full screen on a phone.
 */
export function SendDetailsSheet({
  sendId,
  onClose,
  onReuse,
}: {
  sendId: number;
  onClose: () => void;
  /** Open the composer with this send's content. Only offered for campaigns and direct emails. */
  onReuse: (send: SendDetail) => void;
}) {
  const t = useTranslations("manageEmails.details");
  const tc = useTranslations("common.actions");
  const locale = useLocale();
  const query = useSend(sendId);
  const send = query.data;
  const title = useSendTitle();
  const kindLabel = useKindLabel();
  const { can } = useAccess();
  const canWrite = send?.kind === "campaign" ? can("emails.blast") : can("emails.direct");

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={locale === "ar" ? "left" : "right"}
        className="w-full! gap-0 sm:max-w-[560px]!"
        closeLabel={tc("close")}
      >
        <SheetHeader className="border-rule border-b p-4 pe-14 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6 sm:pe-14">
          <div className="flex items-start gap-3">
            {send && <Plate tone="neutral" icon={KIND_ICON[send.kind]} />}
            <div className="flex min-w-0 flex-col gap-1">
              <SheetDescription className="text-ink-2 text-[13px] font-bold">
                {send ? kindLabel(send.kind) : t("loading")}
              </SheetDescription>
              <SheetTitle className="text-xl wrap-anywhere">
                {/* The kind is already the line above; a certificate's title is then just its event. */}
                <bdi>{send ? (isCertificate(send) ? (send.event?.name ?? kindLabel(send.kind)) : title(send)) : ""}</bdi>
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
          {query.isPending && <RowsSkeleton rows={4} />}
          {query.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{t("loadFailed")}</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <span>{errorMessage(query.error, t("loadFailed"))}</span>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  {t("tryAgain")}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {send && (
            <>
              <Summary send={send} />
              {(send.failed > 0 || send.failures.length > 0 || send.status === "failed") && <Failures send={send} />}
              <Recipients send={send} />
              <Message send={send} />
              {canReuse(send) && send.content && canWrite && (
                <Button variant="outline" className="self-start" onClick={() => onReuse(send)}>
                  <SquarePen />
                  {t("useAsStart")}
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Summary({ send }: { send: SendDetail }) {
  const t = useTranslations("manageEmails.details");
  const fmt = useFormatters();
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] [&_dd]:wrap-anywhere">
      <Fact term={t("status")}>
        <span className="flex flex-col items-start gap-2">
          <SendStatusPill send={send} />
          {isSending(send) && <SendProgress send={send} />}
        </span>
      </Fact>
      <Fact term={t("recipientsCount")}>
        <span className="tabular">{fmt.number(send.total)}</span>
      </Fact>
      {send.event && (
        <Fact term={t("event")}>
          <Link href={`/events/${send.event.id}`} className="text-door-indigo-ink underline underline-offset-2">
            <bdi>{send.event.name}</bdi>
          </Link>
        </Fact>
      )}
      <Fact term={t("sender")}>
        <bdi>{send.sender.name}</bdi>
      </Fact>
      <Fact term={t("started")}>
        <span className="tabular">{fmt.dateTime(send.created_at)}</span>
      </Fact>
      {send.finished_at && (
        <Fact term={t("finished")}>
          <span className="tabular">{fmt.dateTime(send.finished_at)}</span>
        </Fact>
      )}
      {send.from_addresses.length > 0 && (
        <Fact term={t("from")}>
          <span className="flex flex-col gap-0.5">
            {send.from_addresses.map((a) => (
              <span key={a.address} className="flex flex-wrap items-baseline gap-x-2">
                <span dir="ltr">{a.address}</span>
                <span className="text-ink-2 tabular text-[13px]">{t("fromCount", { count: a.count })}</span>
              </span>
            ))}
          </span>
        </Fact>
      )}
    </dl>
  );
}

function Failures({ send }: { send: SendDetail }) {
  const t = useTranslations("manageEmails.details");
  const tc = useTranslations("common.actions");
  const { can } = useAccess();
  const retry = useRetryCertificates();
  const [confirming, setConfirming] = React.useState(false);
  const event = send.event;
  const canRetry = send.kind === "event-certificate" && event && can("emails.event") && !isSending(send);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(send.failures.map((f) => f.recipient).join("\n"));
      toast.success(t("copied", { count: send.failures.length }));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const doRetry = async () => {
    if (!event) return;
    try {
      const res = await retry.mutateAsync(event.id);
      toast.success(t("retryStarted", { count: res.recipient_count }));
    } catch (err) {
      toast.error(errorMessage(err, t("retryFailed")));
    }
  };

  return (
    <section aria-labelledby="send-failures" className="flex flex-col gap-1">
      <SectionHead
        id="send-failures"
        title={t("failures")}
        count={send.failed || undefined}
        countTone="madder"
        action={
          canRetry ? (
            <Button size="sm" onClick={() => setConfirming(true)} disabled={retry.isPending}>
              {retry.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <RotateCw />}
              {t("retry")}
            </Button>
          ) : send.failures.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => void copy()}>
              <Copy />
              {t("copyAddresses")}
            </Button>
          ) : null
        }
      />
      {send.failures.length === 0 ? (
        <p className="text-ink-2 py-2 text-sm">{t("noFailures")}</p>
      ) : (
        send.failed > send.failures.length && (
          <p className="text-ink-2 py-2 text-sm">{t("incompleteFailures", { count: send.failures.length })}</p>
        )
      )}
      <ul className="flex flex-col">
        {send.failures.map((f, i) => (
          <li key={`${f.recipient}-${i}`} className="border-rule flex flex-col gap-0.5 border-b px-1 py-2.5">
            <span className="text-sm font-bold break-all">
              <bdi>{f.recipient}</bdi>
            </span>
            <span className="text-door-madder-ink text-[13px] wrap-anywhere">
              <bdi>{f.error}</bdi>
            </span>
          </li>
        ))}
      </ul>
      {event && (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("retryTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("retryDescription", { event: isolate(event.name) })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void doRetry()}>{t("retry")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}

function Recipients({ send }: { send: SendDetail }) {
  const t = useTranslations("manageEmails.details");
  const [search, setSearch] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  const failed = React.useMemo(() => new Set(send.failures.map((f) => f.recipient.toLowerCase())), [send.failures]);

  const needle = normalizeArabic(search.trim().toLowerCase());
  const matches = needle
    ? send.recipients.filter((r) => normalizeArabic(`${r.name ?? ""} ${r.email}`.toLowerCase()).includes(needle))
    : send.recipients;
  const shown = showAll || needle ? matches : matches.slice(0, FIRST_RECIPIENTS);

  return (
    <section aria-labelledby="send-recipients" className="flex flex-col gap-2">
      <SectionHead id="send-recipients" title={t("recipients")} count={send.recipients.length} />
      {send.recipients.length === 0 ? (
        <p className="text-ink-2 py-2 text-sm">{t("noRecipients")}</p>
      ) : (
        <>
          <div className="relative">
            <Search className="text-ink-2 pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label={t("searchRecipients")}
              placeholder={t("searchRecipients")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <ul className="flex flex-col">
            {shown.map((r, i) => (
              <li key={`${r.email}-${i}`} className="border-rule flex min-h-12 items-center gap-3 border-b px-1 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  {r.name && (
                    <span className="truncate text-sm font-bold">
                      <bdi>{r.name}</bdi>
                    </span>
                  )}
                  <span className="text-ink-2 truncate text-[13px]">
                    <bdi>{r.email}</bdi>
                  </span>
                </span>
                {failed.has(r.email.toLowerCase()) && <StatePill tone="madder">{t("failedOne")}</StatePill>}
              </li>
            ))}
            {needle && matches.length === 0 && <li className="text-ink-2 py-3 text-sm">{t("noMatch")}</li>}
          </ul>
          {!showAll && !needle && matches.length > FIRST_RECIPIENTS && (
            <Button variant="outline" className="self-start" onClick={() => setShowAll(true)}>
              {t("showAll", { count: matches.length })}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function Message({ send }: { send: SendDetail }) {
  const t = useTranslations("manageEmails.details");
  const { content } = send;
  const subject = content?.subject ?? send.subject;

  return (
    <section aria-labelledby="send-message" className="flex flex-col gap-3">
      <SectionHead id="send-message" title={t("message")} />
      {!content ? (
        <p className="text-ink-2 text-sm">{isCertificate(send) ? t("certificateNoBody") : t("noContent")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] [&_dd]:wrap-anywhere">
            {subject && (
              <Fact term={t("subject")}>
                <bdi>{subject}</bdi>
              </Fact>
            )}
            {content.preview_text && (
              <Fact term={t("previewText")}>
                <bdi>{content.preview_text}</bdi>
              </Fact>
            )}
          </dl>
          {content.attachments.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {content.attachments.map((a) => (
                <li key={a.url}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-sunk hover:bg-mortar inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold"
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                    <bdi className="max-w-60 truncate">{a.filename}</bdi>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {content.html_content ? (
            <ScaledEmailFrame
              srcDoc={content.html_content}
              title={t("message")}
              className="ring-rule mx-auto overflow-hidden rounded-lg ring-1"
            />
          ) : (
            <p className="text-ink-2 text-sm">{t("noContent")}</p>
          )}
        </>
      )}
    </section>
  );
}

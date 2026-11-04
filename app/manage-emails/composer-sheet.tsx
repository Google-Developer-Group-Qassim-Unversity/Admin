"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import {
  FlaskConical,
  LayoutTemplate,
  Loader2,
  Palette,
  Paperclip,
  Send as SendIcon,
  Upload,
  Users,
  AtSign,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload";
import { FieldHelp } from "@/components/field-help";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/hooks/use-access";
import {
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_FILE_SIZE,
  MAX_TOTAL_ATTACHMENT_SIZE,
  useAttachmentUploads,
} from "@/hooks/use-attachment-uploads";
import { useBlastEligibleCount, useSendBlast, useSendBlastTest, useSendDirect } from "@/hooks/use-email-sends";
import { errorMessage } from "@/lib/api/errors";
import type { BlastOrderBy, EmailAttachmentInfo } from "@/lib/api-types";
import { isolate, useFormatters } from "@/lib/format";
import { cn } from "@/lib/utils";

import { formatSize, sanitizeHtml } from "./email-composer-utils";
import { RecipientsField, toRecipientInput, type RecipientEntry } from "./recipients-field";
import { ScaledEmailFrame } from "./scaled-email-frame";

export type Audience = "members" | "people";

/** What the composer opens with: blank, or a past campaign / direct email used as the start of a new one. */
export interface ComposerStart {
  audience: Audience;
  subject: string;
  previewText: string;
  html: string;
  attachments: { filename: string; url: string }[];
}

const CLUB_TEMPLATE = "/assets/emails/email_template.html";

/** The brand files the old Assets panel listed: certificate backgrounds, official and unofficial, both languages. */
const DESIGN_FILES = [
  { key: "officialAr", href: "/assets/emails/official-ar.svg" },
  { key: "officialEn", href: "/assets/emails/official-en.svg" },
  { key: "unofficialAr", href: "/assets/emails/unofficial-ar.svg" },
  { key: "unofficialEn", href: "/assets/emails/unofficial-en.svg" },
] as const;

/** A carried-over attachment only has a name and a URL; the send endpoints also want a type. */
function carriedAttachment(a: { filename: string; url: string }): EmailAttachmentInfo {
  const ext = a.filename.split(".").pop()?.toLowerCase() ?? "";
  const content_type =
    ext === "pdf" ? "application/pdf" : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/octet-stream";
  return { filename: a.filename, url: a.url, content_type };
}

/**
 * Writing a new email: to club members (`POST /emails/blast`) or to specific
 * people (`POST /emails/direct`). Stay mounted through the exit animation,
 * then release the draft; closing with unsaved work asks first.
 */
export function ComposerSheet({ start, onClose, onSent }: { start: ComposerStart | null; onClose: () => void; onSent: () => void }) {
  const t = useTranslations("manageEmails.composer");
  const tc = useTranslations("common.actions");
  const locale = useLocale();
  const fmt = useFormatters();
  const { can } = useAccess();
  const { user } = useUser();
  const myEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const canBlast = can("emails.blast");
  const canDirect = can("emails.direct");
  const [audience, setAudience] = React.useState<Audience>(
    start?.audience === "people" && canDirect ? "people" : canBlast ? "members" : "people",
  );
  const toMembers = audience === "members";

  const [count, setCount] = React.useState<number | null>(null); // null: everyone it can reach today
  const [orderBy, setOrderBy] = React.useState<BlastOrderBy>("activity");
  const [always, setAlways] = React.useState<RecipientEntry[]>([]);
  const [recipientDrafts, setRecipientDrafts] = React.useState({ always: false, people: false });
  const [people, setPeople] = React.useState<RecipientEntry[]>([]);
  const [subject, setSubject] = React.useState(start?.subject ?? "");
  const [previewText, setPreviewText] = React.useState(start?.previewText ?? "");
  const [html, setHtml] = React.useState(start?.html ?? "");
  const [carried, setCarried] = React.useState<EmailAttachmentInfo[]>(() => (start?.attachments ?? []).map(carriedAttachment));
  const [view, setView] = React.useState<"write" | "preview">("write");
  const previewHtml = React.useMemo(() => typeof DOMParser === "undefined" ? "" : sanitizeHtml(html), [html]);
  const [open, setOpen] = React.useState(true);
  const closeDone = React.useRef(false);
  const finishClose = React.useCallback(() => {
    if (closeDone.current) return;
    closeDone.current = true;
    onClose();
  }, [onClose]);
  React.useEffect(() => {
    if (open) return;
    // Reduced motion has no animationend. Also cover interrupted animations.
    const timer = window.setTimeout(finishClose, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
    return () => window.clearTimeout(timer);
  }, [open, finishClose]);
  const [confirmingSend, setConfirmingSend] = React.useState(false);
  const [confirmingClose, setConfirmingClose] = React.useState(false);

  const uploads = useAttachmentUploads();
  const eligibleQuery = useBlastEligibleCount(canBlast);
  const blast = useSendBlast();
  const direct = useSendDirect();
  const test = useSendBlastTest();

  const eligible = eligibleQuery.data?.eligible_count ?? 0;
  const remaining = eligibleQuery.data?.remaining_capacity ?? null;
  // Guaranteed members are excluded by the backend before it selects the pool.
  // The member pool is capped separately; guaranteed recipients are added on top.
  const poolSize = Math.max(0, eligible - always.filter((r) => r.member_id != null).length);
  const cap = Math.max(0, Math.min(poolSize, remaining === null ? poolSize : remaining));
  const requestedCount = count === null ? cap : Math.min(count, poolSize);
  const memberCount = Math.min(requestedCount, cap);
  const total = toMembers ? memberCount + always.length : people.length;
  const overCapacity = toMembers && requestedCount > cap;

  const attachments = [...carried, ...uploads.readyAttachments];
  const busy = blast.isPending || direct.isPending;
  const attachmentsBlocked = uploads.isUploadingAttachments || uploads.attachmentSizeExceeded || uploads.hasFailedAttachments;
  const hasMessage = subject.trim() !== "" && html.trim() !== "";
  const canSend = hasMessage && total > 0 && !attachmentsBlocked && !busy && !test.isPending &&
    (toMembers ? canBlast && eligibleQuery.isSuccess : canDirect);

  const dirty =
    subject !== (start?.subject ?? "") ||
    previewText !== (start?.previewText ?? "") ||
    html !== (start?.html ?? "") ||
    recipientDrafts.always || recipientDrafts.people ||
    always.length > 0 ||
    people.length > 0 ||
    count !== null ||
    orderBy !== "activity" ||
    audience !== (start?.audience ?? (canBlast ? "members" : "people")) ||
    uploads.files.length > 0 ||
    carried.length !== (start?.attachments.length ?? 0);

  React.useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const requestClose = () => {
    if (dirty && !busy) setConfirmingClose(true);
    else if (!busy) setOpen(false);
  };

  const loadTemplate = async () => {
    try {
      const res = await fetch(CLUB_TEMPLATE);
      if (!res.ok) throw new Error(res.statusText);
      const before = html;
      setHtml(await res.text());
      if (before.trim()) {
        toast(t("templateLoaded"), { action: { label: t("undo"), onClick: () => setHtml(before) } });
      }
    } catch {
      toast.error(t("templateFailed"));
    }
  };

  const sendTest = async () => {
    if (!myEmail) return;
    try {
      await test.mutateAsync({
        subject: subject.trim(),
        html_content: sanitizeHtml(html),
        preview_text: toMembers ? previewText.trim() || undefined : undefined,
        test_emails: [myEmail],
        attachments,
      });
      toast.success(t("testSent", { email: isolate(myEmail) }));
    } catch (err) {
      toast.error(errorMessage(err, t("testFailed")));
    }
  };

  const send = async () => {
    if (!canSend) return;
    const html_content = sanitizeHtml(html);
    try {
      if (toMembers) {
        await blast.mutateAsync({
          subject: subject.trim(),
          html_content,
          preview_text: previewText.trim() || undefined,
          count: memberCount,
          order_by: orderBy,
          guaranteed_recipients: always.map(toRecipientInput),
          attachments,
        });
      } else {
        await direct.mutateAsync({ subject: subject.trim(), html_content, recipients: people.map(toRecipientInput), attachments });
      }
      toast.success(t("started"));
      setConfirmingSend(false);
      onSent();
      setOpen(false);
    } catch (err) {
      setConfirmingSend(false);
      toast.error(errorMessage(err, t("sendFailed")));
    }
  };

  const audiences = [
    canBlast && { value: "members", label: t("audience.members"), icon: Users },
    canDirect && { value: "people", label: t("audience.people"), icon: AtSign },
  ].filter((o) => o !== false);

  const help = (field: "audience" | "count" | "order" | "always" | "capacity" | "previewText" | "attachments" | "test", label: string) => (
    <FieldHelp label={t("helpLabel", { field: label })}>{t(`help.${field}`)}</FieldHelp>
  );

  return (
    <Sheet open={open} onOpenChange={(open) => !open && requestClose()}>
      <SheetContent
        side={locale === "ar" ? "left" : "right"}
        className="w-full! gap-0 sm:max-w-[min(1040px,100vw)]!"
        closeLabel={tc("close")}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.currentTarget.dataset.state === "closed") finishClose();
        }}
      >
        <SheetHeader className="border-rule border-b p-4 pe-14 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <SheetTitle className="text-xl">{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* Who it goes to */}
          <section className="flex flex-col gap-3" aria-label={t("to")}>
            <div className="flex items-center gap-1"><span className="text-sm font-bold">{t("to")}</span>{help("audience", t("to"))}</div>
            {audiences.length > 1 && (
              <SegmentedControl
                label={t("to")}
                value={audience}
                onValueChange={(v) => setAudience(v as Audience)}
                options={audiences}
                disabled={busy}
              />
            )}
            {canBlast && <AudiencePanel active={toMembers}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex min-h-11 flex-wrap items-center gap-1">
                      <Label htmlFor="composer-count">{t("count")}</Label>
                      {help("count", t("count"))}
                      <Button type="button" variant="ghost" size="sm" className="ms-auto min-h-11" onClick={() => setCount(null)} disabled={busy || !poolSize}>
                        {t("everyone")}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 tabular">
                      <output htmlFor="composer-count" className="text-xl font-bold">{fmt.number(requestedCount)}</output>
                      <span className="text-ink-2 text-sm">{t("outOf", { total: fmt.number(poolSize) })}</span>
                      <Input
                        id="composer-count"
                        aria-label={t("exactCount")}
                        type="number"
                        inputMode="numeric"
                        min={poolSize ? 1 : 0}
                        max={poolSize}
                        value={requestedCount}
                        onChange={(e) => setCount(Math.min(poolSize, Math.max(poolSize ? 1 : 0, Math.floor(Number(e.target.value) || 0))))}
                        disabled={busy || !poolSize || eligibleQuery.isPending}
                        className="ms-auto w-20 text-sm md:text-sm"
                      />
                    </div>
                    <div className="relative">
                      <Slider
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        aria-label={t("count")}
                        aria-describedby="composer-capacity"
                        min={1}
                        max={Math.max(2, poolSize)}
                        step={1}
                        value={[Math.max(1, requestedCount)]}
                        onValueChange={([value]) => setCount(Math.min(poolSize, value))}
                        onKeyDown={(event) => {
                          if (event.key !== "PageUp" && event.key !== "PageDown") return;
                          event.preventDefault();
                          setCount(Math.max(1, Math.min(poolSize, requestedCount + (event.key === "PageUp" ? 1 : -1) * Math.max(1, Math.round(poolSize / 10)))));
                        }}
                        disabled={busy || poolSize < 2 || eligibleQuery.isPending}
                      />
                      {remaining !== null && cap < poolSize && poolSize > 1 && (
                        <span data-capacity-mark aria-hidden="true" className="bg-door-ochre pointer-events-none absolute top-3 h-5 w-0.5" style={{ insetInlineStart: `${Math.max(0, (cap - 1) / (poolSize - 1)) * 100}%` }} />
                      )}
                    </div>
                    {eligibleQuery.data && <p className="text-ink-2 text-[13px]">{t("countHint", { eligible: fmt.number(eligible) })}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex min-h-11 items-center gap-1"><span className="text-sm font-bold">{t("order")}</span>{help("order", t("order"))}</div>
                    <SegmentedControl label={t("order")} value={orderBy} onValueChange={(v) => setOrderBy(v as BlastOrderBy)} options={[
                      { value: "activity", label: t("orderActivity") },
                      { value: "alphabetical", label: t("orderName") },
                    ]} disabled={busy} />
                  </div>
                </div>
                <RecipientsField id="composer-always" label={t("always")} hint={t("alwaysHint")}
                  help={{ label: t("helpLabel", { field: t("always") }), content: t("help.always") }}
                  value={always} onChange={setAlways} onDraftChange={(always) => setRecipientDrafts((drafts) => ({ ...drafts, always }))} disabled={busy} />
              </div>
            </AudiencePanel>}
            {canDirect && <AudiencePanel active={!toMembers}>
              <RecipientsField id="composer-people" label={t("people")} value={people} onChange={setPeople} onDraftChange={(people) => setRecipientDrafts((drafts) => ({ ...drafts, people }))} disabled={busy} />
            </AudiencePanel>}
            {toMembers && eligibleQuery.isPending && <p className="text-ink-2 text-sm">{t("capacityLoading")}</p>}
            {toMembers && eligibleQuery.isError && (
              <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-door-madder-ink">{t("capacityFailed")}</span>
                <Button variant="outline" onClick={() => void eligibleQuery.refetch()}>{tc("retry")}</Button>
              </div>
            )}
            {toMembers && remaining !== null && (
              <div id="composer-capacity" className="bg-sunk text-ink-2 flex items-center gap-2 rounded-lg ps-3 pe-1 py-1 text-[13px]">
                <SendIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">
                  {t("capacity", { remaining: fmt.number(remaining) })}
                  {overCapacity && <> {t("capped", { total: fmt.number(memberCount) })}</>}
                  {always.length > 0 && <> {t("guaranteedCapacity")}</>}
                </span>
                {help("capacity", t("capacityLabel"))}
              </div>
            )}
          </section>

          {/* The message */}
          <section className="flex flex-col gap-4" aria-label={t("message")}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="composer-subject">{t("subject")}</Label>
              <Input
                id="composer-subject"
                dir="auto"
                enterKeyHint="next"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
              />
            </div>
            {toMembers && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1"><Label htmlFor="composer-preview">{t("previewText")}</Label>{help("previewText", t("previewText"))}</div>
                <Input
                  id="composer-preview"
                  dir="auto"
                  enterKeyHint="done"
                  placeholder={t("previewTextHint")}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  disabled={busy}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="composer-html" className="w-full sm:me-auto sm:w-auto">
                  {t("body")}
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadTemplate()} disabled={busy} className="max-sm:flex-1">
                  <LayoutTemplate />
                  {t("clubTemplate")}
                </Button>
                <DropdownMenu dir={locale === "ar" ? "rtl" : "ltr"}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="max-sm:flex-1">
                      <Palette />
                      {t("designFiles")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {DESIGN_FILES.map((f) => (
                      <DropdownMenuItem key={f.key} asChild>
                        <a href={f.href} target="_blank" rel="noreferrer">
                          {t(`files.${f.key}`)}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Phone: write or preview. From lg the two sit side by side. */}
              <SegmentedControl
                label={t("body")}
                value={view}
                onValueChange={(v) => setView(v as "write" | "preview")}
                options={[
                  { value: "write", label: t("write") },
                  { value: "preview", label: t("preview") },
                ]}
                className="lg:hidden"
              />
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:gap-4 lg:grid-cols-[minmax(0,1fr)_375px]">
                <Textarea
                  id="composer-html"
                  dir="ltr"
                  spellCheck={false}
                  placeholder={t.raw("htmlPlaceholder")}
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  disabled={busy}
                  className={cn(
                    "h-[60dvh] min-h-80 resize-none font-mono text-[13px] md:text-[13px] lg:h-[667px]",
                    "transition-[opacity,visibility] duration-150 ease-out motion-reduce:transition-none max-lg:[grid-area:1/1]",
                    view === "preview" && "max-lg:invisible max-lg:pointer-events-none max-lg:opacity-0",
                  )}
                />
                <div id="composer-preview-pane" className={cn("flex min-w-0 justify-center transition-[opacity,visibility] duration-150 ease-out motion-reduce:transition-none max-lg:[grid-area:1/1]", view === "write" && "max-lg:invisible max-lg:pointer-events-none max-lg:opacity-0")}>
                  {html.trim() ? (
                    <ScaledEmailFrame srcDoc={previewHtml} title={t("preview")} className="ring-rule overflow-hidden rounded-lg ring-1" />
                  ) : (
                    <p className="bg-sunk text-ink-2 grid min-h-60 w-full place-items-center rounded-lg p-6 text-center text-sm lg:h-[667px]">
                      {t("previewEmpty")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1"><span className="text-sm font-bold">{t("attachments")}</span>{help("attachments", t("attachments"))}</div>
              {carried.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {carried.map((a) => (
                    <li key={a.url} className="bg-sunk flex min-h-11 items-center gap-2 rounded-lg ps-3 pe-1 text-sm font-bold">
                      <Paperclip className="size-4" aria-hidden="true" />
                      <bdi className="max-w-52 truncate">{a.filename}</bdi>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={tc("remove")}
                        onClick={() => setCarried((prev) => prev.filter((x) => x.url !== a.url))}
                        disabled={busy}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {can("uploads") && <FileUpload
                multiple
                maxFiles={Math.max(0, MAX_ATTACHMENT_FILES - carried.length)}
                maxSize={MAX_ATTACHMENT_FILE_SIZE}
                accept="image/*,application/pdf"
                value={uploads.files}
                onAccept={uploads.handleFilesAccepted}
                onFileReject={() => toast.error(t("fileRejected", { max: MAX_ATTACHMENT_FILES, size: formatSize(MAX_ATTACHMENT_FILE_SIZE) }))}
                disabled={busy || carried.length >= MAX_ATTACHMENT_FILES}
                label={t("attachments")}
              >
                <FileUploadDropzone className="min-h-20 flex-col">
                  <Upload className="text-ink-2 size-5" aria-hidden="true" />
                  <p className="text-ink-2 text-[13px]">
                    {t("dropzone", { max: MAX_ATTACHMENT_FILES, size: formatSize(MAX_ATTACHMENT_FILE_SIZE) })}
                  </p>
                </FileUploadDropzone>
                <FileUploadList>
                  {uploads.attachmentEntries.map((entry) => (
                    <FileUploadItem key={`${entry.file.name}-${entry.file.lastModified}`} value={entry.file}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      {entry.status === "error" && <span className="text-door-madder-ink text-xs">{t("attachmentFailed")}</span>}
                      {entry.status === "uploading" && (
                        <Loader2 className="text-ink-2 size-4 animate-spin motion-reduce:animate-none" />
                      )}
                      <FileUploadItemDelete asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={tc("remove")}
                          onClick={() => uploads.handleRemoveFile(entry.file)}
                        >
                          <X />
                        </Button>
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  ))}
                </FileUploadList>
              </FileUpload>}
              {uploads.attachmentSizeExceeded && (
                <p className="text-door-madder-ink text-[13px] font-bold">
                  {t("tooLarge", {
                    total: formatSize(uploads.totalAttachmentSize),
                    limit: formatSize(MAX_TOTAL_ATTACHMENT_SIZE),
                  })}
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="bg-card border-foreground shrink-0 flex flex-wrap items-center gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {canBlast && myEmail && (
            <div className="flex items-center max-sm:flex-1"><Button
              type="button"
              variant="outline"
              onClick={() => void sendTest()}
              disabled={!hasMessage || attachmentsBlocked || test.isPending || busy}
              className="max-sm:flex-1"
            >
              {test.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <FlaskConical />}
              {t("test")}
            </Button>{help("test", t("test"))}</div>
          )}
          <Button
            type="button"
            variant="green"
            onClick={() => setConfirmingSend(true)}
            disabled={!canSend}
            className="ms-auto max-sm:flex-1"
          >
            {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <SendIcon className="rtl:-scale-x-100" />}
            {t("send", { count: total })}
          </Button>
        </div>

        <AlertDialog open={confirmingSend} onOpenChange={setConfirmingSend}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t(toMembers ? "confirmMembersTitle" : "confirmTitle", { count: total })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("confirmDescription", { subject: isolate(subject.trim()) })}
                {overCapacity && <> {t("capped", { total: fmt.number(memberCount) })}</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
              <AlertDialogAction variant="green" disabled={!canSend} onClick={(event) => { event.preventDefault(); void send(); }}>
                {t("confirmSend")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmingClose} onOpenChange={setConfirmingClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("discardDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("keepWriting")}</AlertDialogCancel>
              <AlertDialogAction variant="madder" onClick={() => { setConfirmingClose(false); setOpen(false); }}>
                {t("discard")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

/** Both panels stay mounted so changing audience preserves its recipients and animates height. */
function AudiencePanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div inert={!active} aria-hidden={!active} className={cn(
    "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
    active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
  )}><div className="min-h-0 overflow-hidden">{children}</div></div>;
}

"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Award, Mail, SquarePen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { EmptyLine } from "@/components/najdi";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAccess } from "@/hooks/use-access";
import { sendKeys } from "@/hooks/use-email-sends";
import type { SendDetail, SendKindFilter, SendsFilters } from "@/lib/api-types";
import { isolate } from "@/lib/format";

import { ComposerSheet, type ComposerStart } from "./composer-sheet";
import { PersonLookup, type Person } from "./person-lookup";
import { KIND_FILTERS } from "./send-bits";
import { SendCertificatesTab } from "./send-certificates-tab";
import { SendDetailsSheet } from "./send-details-sheet";
import { SendsFeed } from "./sends-feed";

/** Message keys under `manageEmails.filters` for each chip. */
const FILTER_KEY: Record<SendKindFilter, string> = {
  campaign: "campaign",
  certificate: "certificate",
  acceptance: "acceptance",
  "event-message": "eventMessage",
  direct: "direct",
  "team-notification": "teamNotification",
};

/**
 * Mail: the club's outbox. Most mail goes out from the event pages; this page
 * answers "what went out, did it go out, did this person get it?", and is
 * where an admin writes a campaign or issues a manual certificate.
 */
export default function ManageEmailsPage() {
  const t = useTranslations("manageEmails");
  const { can } = useAccess();
  const [kind, setKind] = React.useState<SendKindFilter | undefined>();
  const [person, setPerson] = React.useState<Person | null>(null);
  const [openSendId, setOpenSendId] = React.useState<number | null>(null);
  // undefined: closed; null: a blank email; otherwise a past send used as the start.
  const [composer, setComposer] = React.useState<ComposerStart | null | undefined>();
  const [certificateOpen, setCertificateOpen] = React.useState(false);

  const canWrite = can("emails.blast") || can("emails.direct");
  const canCertify = can("certificates.manual");
  const canSeeLog = can("emails.logs");

  const filters = React.useMemo<SendsFilters>(
    () => ({
      kind,
      member_id: person?.member_id,
      email: person?.email,
    }),
    [kind, person],
  );

  const reuse = (send: SendDetail) => {
    if (!send.content) return;
    setOpenSendId(null);
    setComposer({
      audience: send.kind === "campaign" ? "members" : "people",
      subject: send.content.subject ?? send.subject ?? "",
      previewText: send.content.preview_text ?? "",
      html: send.content.html_content ?? "",
      attachments: send.content.attachments,
    });
  };

  const showOutbox = () => { setKind(undefined); setPerson(null); };

  const emptyText = person
    ? t("feed.emptyPerson", { name: isolate(person.name) })
    : kind
      ? t("feed.emptyKind")
      : t("feed.empty");

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Mail}>
        {canCertify && (
          <Button variant="outline" onClick={() => setCertificateOpen(true)}>
            <Award />
            {t("issueCertificate")}
          </Button>
        )}
        {canWrite && (
          <Button onClick={() => setComposer(null)}>
            <SquarePen />
            {t("newEmail")}
          </Button>
        )}
      </PageHeader>

      {canSeeLog ? (
        <>
          <PersonLookup person={person} onPersonChange={setPerson} />

          <KindChips value={kind} onChange={setKind} />

          <SendsFeed filters={filters} emptyText={emptyText} onOpen={setOpenSendId} />
        </>
      ) : (
        <EmptyLine>{t("noLogAccess")}</EmptyLine>
      )}

      {openSendId !== null && (
        <SendDetailsSheet sendId={openSendId} onClose={() => setOpenSendId(null)} onReuse={reuse} />
      )}
      {composer !== undefined && <ComposerSheet start={composer} onClose={() => setComposer(undefined)} onSent={showOutbox} />}
      {certificateOpen && <CertificateSheet onClose={() => setCertificateOpen(false)} />}
    </div>
  );
}

/** One line of chips that scrolls sideways on a phone. "All" leaves team notifications out. */
function KindChips({ value, onChange }: { value: SendKindFilter | undefined; onChange: (k: SendKindFilter | undefined) => void }) {
  const t = useTranslations("manageEmails.filters");
  const locale = useLocale();
  const chip =
    "h-11 shrink-0 rounded-sm px-3 text-[13.5px] font-bold pointer-coarse:h-11 bg-card text-ink-2 ring-1 ring-rule hover:bg-sunk hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:ring-foreground";
  return (
    <ToggleGroup
      type="single"
      spacing={2}
      dir={locale === "ar" ? "rtl" : "ltr"}
      aria-label={t("label")}
      value={value ?? "all"}
      // Picking the chip that is already on would clear it; keep one always on.
      onValueChange={(v) => v && onChange(v === "all" ? undefined : (v as SendKindFilter))}
      className="no-scrollbar -mx-4 w-auto max-w-none justify-start overflow-x-auto overscroll-x-contain px-4 py-0.5 sm:mx-0 sm:px-0.5"
    >
      <ToggleGroupItem value="all" className={chip}>
        {t("all")}
      </ToggleGroupItem>
      {KIND_FILTERS.map((k) => (
        <ToggleGroupItem key={k} value={k} className={chip}>
          {t(FILTER_KEY[k])}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** The manual-certificate form (individual or a CSV batch), in a sheet over the outbox. */
function CertificateSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("manageEmails");
  const tc = useTranslations("common.actions");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const onSent = ({ close }: { close: boolean }) => {
    void queryClient.invalidateQueries({ queryKey: sendKeys.all });
    if (close) onClose();
  };
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={locale === "ar" ? "left" : "right"}
        className="w-full! gap-0 sm:max-w-[min(960px,100vw)]!"
        closeLabel={tc("close")}
      >
        <SheetHeader className="border-rule border-b p-4 pe-14 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <SheetTitle className="text-xl">{t("issueCertificate")}</SheetTitle>
          <SheetDescription>{t("issueCertificateHint")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:p-6">
          <SendCertificatesTab onSent={onSent} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

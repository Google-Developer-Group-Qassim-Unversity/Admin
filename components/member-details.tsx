"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { Check, Copy, ExternalLink, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberStatePill } from "@/components/manage-members/member-state-pill";
import { useAccess } from "@/hooks/use-access";
import { useMemberDetails } from "@/hooks/use-members";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

/** The least a screen knows about a member: enough to name them and look the rest up. */
export interface MemberRef {
  id: number;
  name: string;
}

export function memberInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A member's name (or avatar) that opens their details - email, university ID,
 * phone and the rest - in a dialog.
 *
 * The details come from `GET /members/{id}`, which needs `members.view`; for
 * anyone without it this renders `children` as plain content, so nothing looks
 * clickable that would only answer with a 403.
 */
export function MemberDetailsTrigger({
  member,
  children,
  className,
}: {
  member: MemberRef;
  children?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("memberDetails");
  const { can } = useAccess();
  const [open, setOpen] = useState(false);
  // Callers passing their own content underline the name in it with `group-hover/member:underline`.
  const content = children ?? <span className="group-hover/member:underline">{member.name}</span>;

  if (!can("members.view")) {
    return <span className={className}>{children ?? member.name}</span>;
  }
  return (
    <>
      <button
        type="button"
        aria-label={t("open", { name: member.name })}
        aria-haspopup="dialog"
        className={cn(
          "group/member min-w-0 cursor-pointer rounded-sm text-start underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className,
        )}
        onClick={(event) => {
          // Rows that are themselves clickable (or labels for a checkbox) must not react too.
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {content}
      </button>
      {open && <MemberDetailsDialog member={member} onClose={() => setOpen(false)} />}
    </>
  );
}

function MemberDetailsDialog({ member, onClose }: { member: MemberRef; onClose: () => void }) {
  const t = useTranslations("memberDetails");
  const common = useTranslations("common");
  const format = useFormatter();
  const { isSuperAdmin } = useAccess();
  const query = useMemberDetails(member.id);
  const details = query.data;
  const date = (iso: string | null | undefined) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "medium" }) : null;
  const gender = details?.gender === "Male" || details?.gender === "Female" ? details.gender : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" closeLabel={common("actions.close")}>
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-foreground text-background flex size-12 shrink-0 items-center justify-center rounded-[4px] text-sm font-bold"
            >
              {memberInitials(details?.name ?? member.name)}
            </span>
            <div className="min-w-0 space-y-1 text-start">
              <DialogTitle className="wrap-anywhere" dir="auto">
                {details?.name ?? member.name}
              </DialogTitle>
              <DialogDescription className="sr-only">{t("description")}</DialogDescription>
              {details && <MemberStatePill authenticated={!!details.is_authenticated} />}
            </div>
          </div>
        </DialogHeader>

        {query.isPending && (
          <div role="status" aria-label={common("states.loading")} className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9" />
            ))}
          </div>
        )}
        {query.error && (
          <div role="alert" className="space-y-3 text-sm">
            <p className="text-door-madder-ink">{t("loadFailed")}</p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              {common("actions.retry")}
            </Button>
          </div>
        )}
        {details && (
          <>
            <dl className="border-foreground flex flex-col border-t">
              <Field label={t("email")} value={details.email} copy ltr />
              <Field label={t("universityId")} value={details.uni_id} copy ltr />
              <Field label={t("phone")} value={details.phone_number} copy ltr />
              <Field label={t("gender")} value={gender && common(`fields.${gender === "Male" ? "male" : "female"}`)} />
              <Field label={t("level")} value={details.uni_level != null ? String(details.uni_level) : null} />
              <Field label={t("college")} value={details.uni_college} />
              <Field label={t("memberId")} value={String(details.id)} ltr />
              <Field label={t("joined")} value={date(details.created_at)} />
              <Field label={t("updated")} value={date(details.updated_at)} />
            </dl>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <a href={`${config.memberAppUrl}/members/${details.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  {t("memberPage")}
                </a>
              </Button>
              {isSuperAdmin && (
                <Button variant="outline" asChild>
                  <Link href={`/permissions?tab=member&member=${details.id}`} onClick={onClose}>
                    <KeyRound />
                    {t("permissions")}
                  </Link>
                </Button>
              )}
              {details.email && (
                <Button asChild>
                  <a href={`mailto:${details.email}`}>
                    <Mail />
                    {t("sendEmail")}
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  copy = false,
  ltr = false,
}: {
  label: string;
  value: string | null | undefined;
  copy?: boolean;
  ltr?: boolean;
}) {
  const t = useTranslations("memberDetails");
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard blocked: the value is on screen to select by hand. */
    }
  }

  return (
    <div className="border-rule flex min-h-11 items-center gap-3 border-b px-1 py-1.5">
      <dt className="text-ink-2 w-28 shrink-0 text-[13px]">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm font-medium">
        {value ? (
          <span className={cn("wrap-anywhere", ltr && "tabular")} dir={ltr ? "ltr" : "auto"}>
            {value}
          </span>
        ) : (
          <span className="text-ink-3 font-normal">{t("notProvided")}</span>
        )}
      </dd>
      {copy && value && (
        <Button
          variant="ghost"
          size="icon"
          className="text-ink-2 size-9 shrink-0"
          aria-label={t(copied ? "copied" : "copy", { field: label })}
          onClick={() => void copyValue()}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      )}
    </div>
  );
}

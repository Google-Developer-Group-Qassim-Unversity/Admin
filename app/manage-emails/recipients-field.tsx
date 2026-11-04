"use client";

import * as React from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAccess } from "@/hooks/use-access";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldHelp } from "@/components/field-help";
import { parseEmailText } from "@/lib/parse-emails";
import { useFormatters } from "@/lib/format";
import { Label } from "@/components/ui/label";
import type { BlastGuaranteedRecipientInput, Member } from "@/lib/api-types";

import { MemberSearchDialog } from "./member-search-dialog";

export interface RecipientEntry {
  name: string;
  email: string;
  member_id?: number;
}

/** What the blast and direct endpoints take for a person: a member by id, anyone else by address. */
export const toRecipientInput = (r: RecipientEntry): BlastGuaranteedRecipientInput =>
  r.member_id ? { member_id: r.member_id } : { email: r.email, name: r.name };

/**
 * A list of people: picked from the members search, or pasted as a list of
 * addresses (commas, spaces or new lines between them). Duplicates are dropped.
 */
export function RecipientsField({
  id,
  label,
  hint,
  help,
  value,
  onChange,
  onDraftChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  help?: { label: string; content: string };
  value: RecipientEntry[];
  onChange: (next: RecipientEntry[]) => void;
  onDraftChange?: (hasDraft: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("manageEmails.recipients");
  const { can } = useAccess();
  const tc = useTranslations("common.actions");
  const [pasted, setPasted] = React.useState("");
  const fmt = useFormatters();
  const parsed = React.useMemo(() => parseEmailText(pasted), [pasted]);
  const alreadyAdded = new Set(value.map((r) => r.email.toLowerCase()));
  const repeated = parsed.duplicates + parsed.emails.filter((r) => alreadyAdded.has(r.email)).length;
  const freshCount = parsed.emails.filter((r) => !alreadyAdded.has(r.email)).length;
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const add = (entries: RecipientEntry[]) => {
    const seen = new Set(value.map((r) => r.email.toLowerCase()));
    const fresh = entries.filter((r) => {
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onChange([...value, ...fresh]);
    return fresh.length;
  };

  const changePasted = (text: string) => {
    setPasted(text);
    onDraftChange?.(text.trim().length > 0);
  };

  const addPasted = () => {
    add(parsed.emails.map(({ email, name }) => ({ name: name || email, email })));
    changePasted(parsed.invalid.join("\n"));
  };

  const addMembers = (members: Member[]) => {
    add(members.map((m) => ({ name: m.name, email: m.email, member_id: m.id })));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center gap-1">
        <Label htmlFor={id}>
          {label}
          {value.length > 0 && <span className="text-ink-2 tabular">({fmt.number(value.length)})</span>}
        </Label>
        {help && <FieldHelp label={help.label}>{help.content}</FieldHelp>}
      </div>
      {hint && <p className="text-ink-2 -mt-1 text-[13px]">{hint}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 gap-2">
          <Textarea
            id={id}
            dir="ltr"
            rows={3}
            inputMode="email"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={t("pastePlaceholder")}
            value={pasted}
            onChange={(e) => changePasted(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                addPasted();
              }
            }}
            disabled={disabled}
            aria-describedby={`${id}-summary ${id}-invalid`}
            className="min-h-24 min-w-0 flex-1 resize-y"
          />
          <Button
            type="button"
            variant="outline"
            aria-label={t("add")}
            onClick={addPasted}
            disabled={disabled || freshCount === 0}
          >
            <Plus />
            {t("add")}{freshCount > 0 && <span className="tabular">{fmt.number(freshCount)}</span>}
          </Button>
        </div>
        {can("members.view") && <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} disabled={disabled}>
          <UserPlus />
          {t("pickMembers")}
        </Button>}
      </div>
      <p id={`${id}-summary`} role="status" className="text-ink-2 text-[13px] tabular">
        {pasted.trim() && t("summary", {
          addresses: t("parsedAddresses", { count: freshCount, total: fmt.number(freshCount) }),
          duplicates: t("parsedDuplicates", { count: repeated, total: fmt.number(repeated) }),
          invalid: t("parsedInvalid", { count: parsed.invalid.length, total: fmt.number(parsed.invalid.length) }),
        })}
      </p>
      <div id={`${id}-invalid`}>
        {parsed.invalid.length > 0 && <p className="text-door-madder-ink text-[13px]">
          {t("invalidHint")} {parsed.invalid.map((token, i) => <React.Fragment key={i}><bdi className="break-all">{token}</bdi>{i < parsed.invalid.length - 1 ? ", " : ""}</React.Fragment>)}
        </p>}
      </div>
      {value.length > 0 && (
        <ul className="ring-rule divide-rule max-h-56 divide-y overflow-y-auto overscroll-contain rounded-lg ring-1">
          {value.map((r) => (
            <li key={r.email} className="flex items-center gap-2 py-1 ps-3 pe-1">
              <span className="flex min-w-0 flex-1 flex-col">
                {r.name !== r.email && (
                  <span className="truncate text-sm font-bold">
                    <bdi>{r.name}</bdi>
                  </span>
                )}
                <span className="text-ink-2 truncate text-[13px]">
                  <bdi>{r.email}</bdi>
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={tc("remove")}
                onClick={() => onChange(value.filter((x) => x.email !== r.email))}
                disabled={disabled}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <MemberSearchDialog open={pickerOpen && can("members.view")} onOpenChange={setPickerOpen} onConfirm={addMembers} />
    </div>
  );
}

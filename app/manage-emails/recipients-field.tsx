"use client";

import * as React from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlastGuaranteedRecipientInput, Member } from "@/lib/api-types";

import { EMAIL } from "./email-composer-utils";
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
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: RecipientEntry[];
  onChange: (next: RecipientEntry[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("manageEmails.recipients");
  const tc = useTranslations("common.actions");
  const [pasted, setPasted] = React.useState("");
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

  const addPasted = () => {
    const tokens = pasted.split(/[\s,;]+/).map((s) => s.replace(/^<|>$/g, "")).filter(Boolean);
    const emails = tokens.filter((s) => EMAIL.test(s));
    add(emails.map((email) => ({ name: email, email })));
    const skipped = tokens.length - emails.length;
    if (skipped > 0) toast.warning(t("skipped", { count: skipped }));
    setPasted("");
  };

  const addMembers = (members: Member[]) => {
    add(members.map((m) => ({ name: m.name, email: m.email, member_id: m.id })));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {value.length > 0 && <span className="text-ink-2 tabular">({value.length})</span>}
      </Label>
      {hint && <p className="text-ink-2 -mt-1 text-[13px]">{hint}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 gap-2">
          <Input
            id={id}
            dir="ltr"
            inputMode="email"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={t("pastePlaceholder")}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPasted();
              }
            }}
            disabled={disabled}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={tc("add")}
            onClick={addPasted}
            disabled={disabled || !pasted.trim()}
          >
            <Plus />
          </Button>
        </div>
        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} disabled={disabled}>
          <UserPlus />
          {t("pickMembers")}
        </Button>
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
      <MemberSearchDialog open={pickerOpen} onOpenChange={setPickerOpen} onConfirm={addMembers} />
    </div>
  );
}

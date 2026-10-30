"use client";

import * as React from "react";
import { AtSign, Search, User, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Plate } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembersPaginated } from "@/hooks/use-members";
import { isolate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/search-utils";

import { EMAIL } from "./email-composer-utils";

/** Whose mail the feed is showing: a member, or any address that is not one. */
export interface Person {
  member_id?: number;
  name: string;
  email: string;
}

/**
 * "Did X get it?": find a member by name, email or university id (or type any
 * address) and the feed below switches to every send that included them.
 */
export function PersonLookup({ person, onPersonChange }: { person: Person | null; onPersonChange: (p: Person | null) => void }) {
  const t = useTranslations("manageEmails.lookup");
  const [text, setText] = React.useState("");
  const [active, setActive] = React.useState(-1);
  const [dismissed, setDismissed] = React.useState(false);
  const search = useDebouncedValue(text.trim(), 250);
  const listId = React.useId();

  const members = useMembersPaginated({ page: 1, pageSize: 6, search, sortBy: "name", order: "asc" }, search.length >= 2);
  const results = search.length >= 2 && search === text.trim() && !members.isPlaceholderData ? (members.data?.items ?? []) : [];
  const typedEmail = EMAIL.test(text.trim()) ? text.trim() : null;
  // A typed address that belongs to a member shows as that member, not twice.
  const showRawEmail = typedEmail && !results.some((m) => m.email.toLowerCase() === typedEmail.toLowerCase());
  const open = text.trim().length >= 2 && !dismissed;
  const options: Person[] = [...results.map((m) => ({ member_id: m.id, name: m.name, email: m.email })), ...(showRawEmail ? [{ name: typedEmail, email: typedEmail }] : [])];

  const pick = (p: Person) => {
    onPersonChange(p);
    setText("");
  };

  if (person) {
    return (
      <div className="panel flex items-center gap-3">
        <Plate tone="neutral" icon={User} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-ink-2 text-[13px]">{t("showingFor")}</span>
          <span className="truncate font-bold"><bdi>{person.name}</bdi></span>
          {person.name !== person.email && (
            <span className="text-ink-2 truncate text-[13px]">
              <bdi>{person.email}</bdi>
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label={t("clear")} onClick={() => onPersonChange(null)}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="text-ink-2 pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2" aria-hidden="true" />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={t("label")}
          placeholder={t("placeholder")}
          value={text}
          onChange={(e) => { setText(e.target.value); setActive(-1); setDismissed(false); }}
          onFocus={() => setDismissed(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDismissed(true); return; }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (options.length) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
              return;
            }
            if (e.key !== "Enter") return;
            e.preventDefault();
            const chosen = active >= 0 ? options[active] : typedEmail
              ? options.find((p) => p.email.toLowerCase() === typedEmail.toLowerCase())
              : options[0];
            if (chosen) pick(chosen);
          }}
          className="h-12 ps-11 text-base md:text-base"
        />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label={t("label")} className="panel flex flex-col p-1!">
          {results.map((m, index) => (
            <li key={m.id} id={`${listId}-${index}`} role="option" aria-selected={active === index} className={active === index ? "bg-sunk" : undefined}>
              <button
                type="button"
                onClick={() => pick({ member_id: m.id, name: m.name, email: m.email })}
                className="hover:bg-sunk focus-visible:outline-ring flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-start outline-none focus-visible:outline-2"
              >
                <User className="text-ink-2 size-[18px] shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold"><bdi>{m.name}</bdi></span>
                  <span className="text-ink-2 truncate text-[13px]">
                    <span className="tabular">{m.uni_id}</span> · <bdi>{m.email}</bdi>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {showRawEmail && (
            <li id={`${listId}-${results.length}`} role="option" aria-selected={active === results.length} className={active === results.length ? "bg-sunk" : undefined}>
              <button
                type="button"
                onClick={() => pick({ name: typedEmail, email: typedEmail })}
                className="hover:bg-sunk focus-visible:outline-ring flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-start outline-none focus-visible:outline-2"
              >
                <AtSign className="text-ink-2 size-[18px] shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{t("useEmail", { email: isolate(typedEmail) })}</span>
              </button>
            </li>
          )}
          {members.isError && (
            <li role="alert" className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="text-door-madder-ink">{t("loadFailed")}</span>
              <Button variant="outline" onClick={() => void members.refetch()}>{t("retry")}</Button>
            </li>
          )}
          {!members.isError && !showRawEmail && results.length === 0 && (
            <li className="text-ink-2 px-3 py-3 text-sm">{members.isFetching || search !== text.trim() ? t("searching") : t("noMatch")}</li>
          )}
        </ul>
      )}
    </div>
  );
}

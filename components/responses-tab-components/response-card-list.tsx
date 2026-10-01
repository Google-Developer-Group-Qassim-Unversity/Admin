"use client";

import type { Table as TanStackTable } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { MemberDetailsTrigger } from "@/components/member-details";
import { URGENCY_STYLES } from "@/components/status-badge";
import type { TableRowData } from "@/lib/responses-utils";
import { cn } from "@/lib/utils";

interface ResponseCardListProps {
  table: TanStackTable<TableRowData>;
  questionKeys: string[];
  emptyLabel: string;
}

/**
 * The responses table as a list of cards, for phones. Shares the table
 * instance with the desktop view, so selection, filtering, sorting and paging
 * are the same state - tapping a card's header toggles its row selection.
 */
export function ResponseCardList({ table, questionKeys, emptyLabel }: ResponseCardListProps) {
  const t = useTranslations("responses");
  const tt = useTranslations("responsesTable");
  const tp = useTranslations("responsesPage.filters");
  const format = useFormatter();
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const allPageSelected = table.getIsAllPageRowsSelected();
  const somePageSelected = table.getIsSomePageRowsSelected();

  return (
    <div className="space-y-2">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground">
        <Checkbox
          className="size-5"
          checked={allPageSelected || (somePageSelected && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
        {t("selectPage")}
      </label>

      <ul className="space-y-2">
        {rows.map((row) => {
          const data = row.original;
          const selected = row.getIsSelected();
          const submitted = new Date(data.submitted_at);
          const answers = questionKeys
            .filter((key) => table.getColumn(key)?.getIsVisible() !== false)
            .map((key) => ({ key, value: data[key] }))
            .filter(({ value }) => value !== null && value !== undefined && value !== "");

          return (
            <li
              key={row.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card transition-colors",
                selected && "border-primary/60 bg-primary/5"
              )}
            >
              <label className="flex cursor-pointer items-start gap-3 p-3">
                <Checkbox
                  className="mt-0.5 size-5"
                  checked={selected}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label={tt("selectRow")}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <bdi>
                      <MemberDetailsTrigger member={{ id: data.member_id, name: String(data.name) }} />
                    </bdi>
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    <span dir="ltr">{data.email}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        data.is_accepted ? URGENCY_STYLES.done.pill : URGENCY_STYLES.waiting.pill
                      )}
                    >
                      {data.is_accepted ? tt("accepted") : tp("notAccepted")}
                    </span>
                    {data.is_invited ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                          URGENCY_STYLES.info.pill
                        )}
                      >
                        {tt("emailed")}
                      </span>
                    ) : null}
                    {!Number.isNaN(submitted.getTime()) && (
                      <time
                        dateTime={submitted.toISOString()}
                        className="tabular ms-auto text-xs text-muted-foreground"
                      >
                        {format.dateTime(submitted, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    )}
                  </div>
                </div>
              </label>

              {answers.length > 0 && (
                <details className="group border-t">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-[13px] font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                    {t("answers")}
                    <span className="tabular text-xs">({answers.length})</span>
                  </summary>
                  <dl className="space-y-2 px-3 pb-3">
                    {answers.map(({ key, value }) => (
                      <div key={key}>
                        <dt className="text-xs text-muted-foreground" dir="auto">
                          {key}
                        </dt>
                        <dd className="text-sm break-words whitespace-pre-wrap" dir="auto">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

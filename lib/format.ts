import { useMemo } from "react";
import { useLocale } from "next-intl";

/**
 * The Intl locale for the reader's language. Western digits and the Gregorian
 * calendar in both languages, spelled out so they do not depend on the ICU
 * build: never `ar-SA`, whose defaults are Arabic-Indic digits and, on some
 * builds, the Hijri calendar (see i18n/request.ts).
 */
export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-GB";
}

type DateInput = Date | string | number;

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

/**
 * Dates and numbers in the reader's language. Use this rather than
 * `toLocaleString()` (which follows the browser, not the app's language) or a
 * hard-coded locale.
 */
export function useFormatters() {
  const locale = useLocale();
  return useMemo(() => {
    const loc = intlLocale(locale);
    const make = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, options);
    const date = make({ day: "numeric", month: "short", year: "numeric" });
    const dateTime = make({ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
    const time = make({ hour: "numeric", minute: "2-digit" });
    const number = new Intl.NumberFormat(loc);
    return {
      locale: loc,
      /** "9 Oct 2026" / "9 أكتوبر 2026" */
      date: (value: DateInput) => date.format(toDate(value)),
      /** "9 Oct 2026, 6:12 pm" */
      dateTime: (value: DateInput) => dateTime.format(toDate(value)),
      /** "6:12 pm" */
      time: (value: DateInput) => time.format(toDate(value)),
      /** "9–12 Oct 2026", collapsed the way the language writes ranges. */
      range: (from: DateInput, to: DateInput) => date.formatRange(toDate(from), toDate(to)),
      /** "1,284" */
      number: (value: number) => number.format(value),
      /** Any other shape of date. */
      custom: (value: DateInput, options: Intl.DateTimeFormatOptions) => make(options).format(toDate(value)),
    };
  }, [locale]);
}

/**
 * "3 hours ago" from an ISO time, in the reader's language; older than a week
 * shows the date instead. Empty string for a missing time.
 */
export function useTimeAgo() {
  const locale = useLocale();
  return useMemo(() => {
    const loc = intlLocale(locale);
    const relative = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
    const absolute = new Intl.DateTimeFormat(loc, { dateStyle: "medium" });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ["day", 86_400],
      ["hour", 3_600],
      ["minute", 60],
    ];
    return (iso: string | null | undefined) => {
      if (!iso) return "";
      const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
      if (seconds < -7 * 86_400) return absolute.format(new Date(iso));
      for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
      }
      return relative.format(0, "minute");
    };
  }, [locale]);
}

/**
 * Wraps user content (a name, a title) dropped into a translated sentence in
 * Unicode isolates, so an Arabic name inside an English sentence (or the
 * reverse) keeps its own direction and does not drag the punctuation around it.
 */
export function isolate(text: string): string {
  return `⁨${text}⁩`;
}

export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

// Arabic until someone picks a language; the choice is then kept in LOCALE_COOKIE.
export const defaultLocale: Locale = "ar";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

// Rendered in the language switcher, each in its own script.
export const localeLabels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return localeDirections[locale];
}

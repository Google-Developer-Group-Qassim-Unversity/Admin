import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./locale";

// Note: the locale is deliberately plain `ar`, never `ar-SA`. `ar` resolves to
// a Gregorian calendar with Latin numerals, which is what this dashboard wants;
// `ar-SA` switches numbers to Arabic-Indic digits (٢٠٢٦) and, on some ICU
// builds, the calendar to Umm al-Qura - which would also desync SSR from the
// browser and produce hydration mismatches.
export default getRequestConfig(async () => {
  const locale = await getLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Riyadh",
  };
});

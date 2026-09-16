import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { QueryProvider } from "@/lib/query-provider";
import { DirectionProvider } from "@/components/direction-provider";
import Page from "@/app/club-structure/page";
import CreateDepartmentPage from "@/app/club-structure/create/page";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

const params = new URLSearchParams(location.search);
const locale = params.get("locale") || "en";
const dir = locale === "ar" ? "rtl" : "ltr";
document.documentElement.lang = locale;
document.documentElement.dir = dir;
document.documentElement.className = params.get("theme") || "dark";
createRoot(document.getElementById("root")).render(
  <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en} timeZone="UTC">
    <DirectionProvider dir={dir}>
      <QueryProvider>
        <main className="mx-auto max-w-7xl p-6">
          {location.pathname === "/club-structure/create" ? <CreateDepartmentPage /> : <Page />}
        </main>
      </QueryProvider>
    </DirectionProvider>
  </NextIntlClientProvider>,
);

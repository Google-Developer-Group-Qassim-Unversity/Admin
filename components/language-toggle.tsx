"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/locale";

export function LanguageToggle() {
  const active = useLocale() as Locale;
  const t = useTranslations("common");
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function select(locale: Locale) {
    if (locale === active) return;
    // The locale lives in a cookie, so the action writes it and the refresh
    // re-renders the whole tree - including `dir` and `lang` on <html>.
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("switchLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuCheckboxItem
            key={locale}
            checked={locale === active}
            onCheckedChange={() => select(locale)}
            lang={locale}
          >
            {localeLabels[locale]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

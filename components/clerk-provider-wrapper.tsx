"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { arSA } from "@clerk/localizations";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { config } from "@/lib/config";
import type { Locale } from "@/i18n/config";

export function ClerkProviderWrapper({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("signIn");

  // The Clerk application is shared with the member app, so its name would
  // read "GDG-Authentication" here. Say what this door is instead.
  const base = locale === "ar" ? arSA : undefined;
  const localization = {
    ...base,
    signIn: {
      ...base?.signIn,
      start: {
        ...base?.signIn?.start,
        title: t("title"),
        subtitle: t("subtitle"),
        // Shown instead when sign-up is enabled on the Clerk instance.
        titleCombined: t("title"),
        subtitleCombined: t("subtitle"),
      },
    },
  };

  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      dynamic
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
      localization={localization}
      appearance={{
        theme: resolvedTheme === "dark" ? dark : undefined,
      }}
    >
      {children}
    </ClerkProvider>
  );
}

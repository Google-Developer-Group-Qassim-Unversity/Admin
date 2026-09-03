"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { arSA } from "@clerk/localizations";
import { useTheme } from "next-themes";
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

  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      dynamic
      localization={locale === "ar" ? arSA : undefined}
      appearance={{
        theme: resolvedTheme === "dark" ? dark : undefined,
      }}
    >
      {children}
    </ClerkProvider>
  );
}

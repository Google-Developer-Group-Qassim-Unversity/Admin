"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { arSA } from "@clerk/localizations";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { config } from "@/lib/config";
import type { Locale } from "@/i18n/config";

/**
 * Clerk's own screens (sign-in, the account menu) dressed in the house's
 * limewash and mud ink. Clerk computes shades from these, so they are literal
 * colours rather than our CSS variables; keep them in step with globals.css.
 */
const HOUSE = {
  light: {
    colorPrimary: "#3a2a1f",
    colorPrimaryForeground: "#f8f3ea",
    colorBackground: "#fbfaf6",
    colorForeground: "#3a2a1f",
    colorMutedForeground: "#6a5443",
    colorMuted: "#eae4d8",
    colorNeutral: "#3a2a1f",
    colorInput: "#fbfaf6",
    colorInputForeground: "#3a2a1f",
    colorBorder: "#dcd2c1",
    colorRing: "#2b4a7e",
    colorDanger: "#a63a2b",
    colorSuccess: "#1f6b57",
    colorWarning: "#d39a1c",
    colorShadow: "#3a2a1f",
  },
  dark: {
    colorPrimary: "#efe6d8",
    colorPrimaryForeground: "#1b1612",
    colorBackground: "#241d18",
    colorForeground: "#efe6d8",
    colorMutedForeground: "#bba892",
    colorMuted: "#2e251e",
    colorNeutral: "#efe6d8",
    colorInput: "#1b1612",
    colorInputForeground: "#efe6d8",
    colorBorder: "#3a2f26",
    colorRing: "#9db7ea",
    colorDanger: "#ee8b7a",
    colorSuccess: "#74c6a9",
    colorWarning: "#e0a93a",
    colorShadow: "#000000",
  },
} as const;

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
        variables: {
          ...HOUSE[resolvedTheme === "dark" ? "dark" : "light"],
          borderRadius: "4px",
          fontFamily: "var(--font-ui)",
          fontFamilyButtons: "var(--font-ui)",
        },
        elements: {
          headerTitle: "font-display! text-2xl! font-semibold!",
          formButtonPrimary: "font-bold! shadow-none!",
          avatarBox: "rounded-[4px]!",
          userButtonAvatarBox: "rounded-[4px]!",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

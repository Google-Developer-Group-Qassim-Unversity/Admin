"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogIn, UserPlus, ArrowLeftRight } from "lucide-react";
import { config } from "@/lib/config";

export function AuthButton() {
  const { isLoaded, isSignedIn } = useUser();
  const t = useTranslations("auth");

  // Loading state
  if (!isLoaded) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  // Signed in state - show user button
  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Link
            label={t("backToMainApp")}
            labelIcon={<ArrowLeftRight className="w-4 h-4" />}
            href={config.memberAppUrl}
          />
          <UserButton.Action label="manageAccount" />
          <UserButton.Action label="signOut" />
        </UserButton.MenuItems>
      </UserButton>
    );
  }

  // Not signed in - show sign up and log in buttons
  const authUrl = config.authFrontendUrl;
  const appUrl = config.thisAppUrl;
  const redirectParam = appUrl
    ? `?redirect_url=${encodeURIComponent(appUrl)}`
    : "";

  const signInUrl = `${authUrl}/sign-in${redirectParam}`;
  const signUpUrl = `${authUrl}/sign-up${redirectParam}`;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild className="gap-2">
        <a href={signInUrl}>
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">{t("logIn")}</span>
        </a>
      </Button>
      <Button variant="default" size="sm" asChild className="gap-2">
        <a href={signUpUrl}>
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("signUp")}</span>
        </a>
      </Button>
    </div>
  );
}

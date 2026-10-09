"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { LogIn, ArrowLeftRight } from "lucide-react";
import { config } from "@/lib/config";

export function AuthButton() {
  const { isLoaded, isSignedIn } = useUser();
  const t = useTranslations("auth");

  // Loading state
  if (!isLoaded) {
    return <Skeleton className="h-9 w-9 rounded-[4px]" />;
  }

  // Signed in state - show user button
  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-9 w-9 rounded-[4px]",
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

  // Not signed in - the middleware normally gets here first.
  return (
    <Button variant="outline" size="sm" asChild className="gap-2">
      <Link href="/sign-in">
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">{t("logIn")}</span>
      </Link>
    </Button>
  );
}

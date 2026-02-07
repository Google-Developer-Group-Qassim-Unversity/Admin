"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogIn, UserPlus } from "lucide-react";

export function AuthButton() {
  const { isLoaded, isSignedIn } = useUser();

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
      />
    );
  }

  // Not signed in - show sign up and log in buttons
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
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
          <span className="hidden sm:inline">Log In</span>
        </a>
      </Button>
      <Button variant="default" size="sm" asChild className="gap-2">
        <a href={signUpUrl}>
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Up</span>
        </a>
      </Button>
    </div>
  );
}

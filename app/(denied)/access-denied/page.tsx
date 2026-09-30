"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccessDenied } from "@/components/ui/access-denied";
import { config } from "@/lib/config";

/**
 * Where the middleware sends anyone it will not let in.
 *
 * - `not_staff`: signed in, but not on this semester's roster. Denied, full
 *   stop: no link onward, nothing about who to ask.
 * - `unavailable`: access could not be checked (the backend did not answer).
 * - no reason: not signed in.
 */
export default function AccessDeniedPage() {
  const reason = useSearchParams().get("reason");
  const t = useTranslations("accessDenied");

  if (reason === "not_staff") {
    return (
      <Shell>
        <AccessDenied title={t("notStaff.title")} description={t("notStaff.description")} />
      </Shell>
    );
  }

  if (reason === "unavailable") {
    return (
      <Shell>
        <AccessDenied title={t("unavailable.title")} description={t("unavailable.description")} />
        <CardContent>
          <Button asChild variant="outline" className="w-full gap-2">
            <Link href="/">
              <RotateCcw className="h-4 w-4" />
              {t("unavailable.retry")}
            </Link>
          </Button>
        </CardContent>
      </Shell>
    );
  }

  const signInUrl = `${config.authFrontendUrl}/sign-in?redirect_url=${encodeURIComponent(config.thisAppUrl)}`;
  return (
    <Shell>
      <AccessDenied title={t("default.title")} description={t("default.description")} />
      <CardContent>
        <Button asChild className="w-full gap-2">
          <a href={signInUrl}>
            <LogIn className="h-4 w-4" />
            {t("signInButton")}
          </a>
        </Button>
      </CardContent>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}

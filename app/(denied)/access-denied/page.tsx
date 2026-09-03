"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AccessDenied } from "@/components/ui/access-denied";
import { config } from "@/lib/config";

export default function AccessDeniedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const t = useTranslations("accessDenied");

  // Check if user has gained admin access - if so, redirect to dashboard
  // But don't redirect if the reason is "not_authorized" (user is logged in but lacks specific permission)
  useEffect(() => {
    if (isLoaded && user && reason !== "not_authorized") {
      const isAdmin = user.publicMetadata?.is_admin === true;
      if (isAdmin) {
        router.push("/");
      }
    }
  }, [isLoaded, user, router, reason]);

  const authUrl = config.authFrontendUrl;
  const appUrl = config.thisAppUrl;
  const redirectParam = appUrl
    ? `?redirect_url=${encodeURIComponent(appUrl)}`
    : "";
  const signInUrl = `${authUrl}/sign-in${redirectParam}`;

  const getContent = () => {
    switch (reason) {
      case "not_admin":
        return {
          title: t("notAdmin.title"),
          description: t("notAdmin.description"),
          showSignIn: false,
        };
      case "not_super_admin":
        return {
          title: t("notSuperAdmin.title"),
          description: t("notSuperAdmin.description"),
          showSignIn: false,
        };
      case "not_authorized":
        return {
          title: t("notAuthorized.title"),
          description: t("notAuthorized.description"),
          showSignIn: false,
        };
      case "config":
        return {
          title: t("config.title"),
          description: t("config.description"),
          showSignIn: false,
        };
      default:
        return {
          title: t("default.title"),
          description: t("default.description"),
          showSignIn: true,
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <AccessDenied title={content.title} description={content.description} />
        <CardContent className="flex flex-col gap-3">
          {content.showSignIn && (
            <Button asChild className="w-full gap-2">
              <a href={signInUrl}>
                <LogIn className="h-4 w-4" />
                {t("signInButton")}
              </a>
            </Button>
          )}
          {reason === "not_admin" && (
            <p className="text-sm text-muted-foreground text-center">
              {t("notAdmin.hint")}
            </p>
          )}
          {reason === "not_super_admin" && (
            <p className="text-sm text-muted-foreground text-center">
              {t("notSuperAdmin.hint")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

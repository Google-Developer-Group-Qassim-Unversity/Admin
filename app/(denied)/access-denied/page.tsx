"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
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
          title: "Admin Access Required",
          description:
            "Your account does not have administrator privileges. This dashboard is restricted to authorized administrators only.",
          showSignIn: false,
        };
      case "not_super_admin":
        return {
          title: "Super Admin Access Required",
          description:
            "This page requires super administrator privileges. Only super admins can manage administrator roles.",
          showSignIn: false,
        };
      case "not_authorized":
        return {
          title: "Insufficient Permissions",
          description:
            "You don't have the required permissions to access this page. Please contact an administrator if you believe this is an error.",
          showSignIn: false,
        };
      case "config":
        return {
          title: "Configuration Error",
          description:
            "The application is not properly configured. Please contact the system administrator.",
          showSignIn: false,
        };
      default:
        return {
          title: "Access Denied",
          description:
            "You must be signed in with an administrator account to access this dashboard.",
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
                Sign In with Admin Account
              </a>
            </Button>
          )}
          {reason === "not_admin" && (
            <p className="text-sm text-muted-foreground text-center">
              If you believe you should have access, 
              please contact albrrak773 or anyone else on the development team.
            </p>
          )}
          {reason === "not_super_admin" && (
            <p className="text-sm text-muted-foreground text-center">
              If you need super admin access, please contact an existing super administrators.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

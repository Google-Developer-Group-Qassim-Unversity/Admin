"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Plate } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { isolate } from "@/lib/format";

function mapExchangeError(error: unknown, t: ReturnType<typeof useTranslations<"settingsPage">>): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "wrong_google_account":
        return t("googleFormsCallbackWrongAccount");
      case "missing_refresh_token":
        return t("googleFormsCallbackMissingRefreshToken");
      case "invalid_oauth_state":
        return t("googleFormsCallbackInvalidState");
      case "google_oauth_not_configured":
        return t("googleFormsCallbackNotConfigured");
      default:
        return t("googleFormsCallbackFailed");
    }
  }
  return t("googleFormsCallbackFailed");
}

function GoogleFormsCallbackInner() {
  const t = useTranslations("settingsPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const api = useApi();

  const googleError = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const initialError = googleError
    ? t("googleFormsCallbackCancelled")
    : !code || !state
      ? t("googleFormsCallbackMissingParams")
      : null;

  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [retrying, setRetrying] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (initialError || !code || !state || startedRef.current) return;
    startedRef.current = true;

    api.forms
      .exchangeGoogleAuth(code, state)
      .then((status) => {
        queryClient.setQueryData(["settings", "google-forms-auth"], status);
        toast.success(
          t("googleFormsCallbackSuccess", {
            email: isolate(status.account_email ?? ""),
          }),
        );
        router.replace("/settings");
      })
      .catch((err) => {
        setErrorMessage(mapExchangeError(err, t));
      });
  }, [api, code, initialError, queryClient, router, state, t]);

  const handleTryAgain = async () => {
    setRetrying(true);
    try {
      const { authorization_url } = await api.forms.startGoogleAuth();
      window.location.assign(authorization_url);
    } catch (err) {
      setErrorMessage(mapExchangeError(err, t));
      setRetrying(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader title={t("googleFormsCallbackTitle")} description={t("googleFormsAuthDescription")} icon={Link2} />

      <div className="panel flex flex-col gap-5 px-5 py-6">
        {errorMessage ? (
          <>
            <div className="flex items-start gap-3">
              <Plate tone="madder" icon={AlertTriangle} />
              <div className="min-w-0 space-y-1">
                <p className="text-[15px] leading-snug font-bold">{t("googleFormsAuthExpired")}</p>
                <p className="text-ink-2 text-[14px]">{errorMessage}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleTryAgain} disabled={retrying}>
                {retrying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    {t("googleFormsAuthConnecting")}
                  </>
                ) : (
                  t("googleFormsCallbackTryAgain")
                )}
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings">{t("googleFormsCallbackBackToSettings")}</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="text-ink-2 h-5 w-5 animate-spin motion-reduce:animate-none" />
            <p className="text-[14px] font-medium">{t("googleFormsCallbackWorking")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleFormsOAuthCallbackPage() {
  const t = useTranslations("settingsPage");
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
          <PageHeader title={t("googleFormsCallbackTitle")} description={t("googleFormsAuthDescription")} icon={Link2} />
          <div className="panel flex items-center gap-3 px-5 py-6">
            <Loader2 className="text-ink-2 h-5 w-5 animate-spin motion-reduce:animate-none" />
            <p className="text-[14px] font-medium">{t("googleFormsCallbackWorking")}</p>
          </div>
        </div>
      }
    >
      <GoogleFormsCallbackInner />
    </Suspense>
  );
}

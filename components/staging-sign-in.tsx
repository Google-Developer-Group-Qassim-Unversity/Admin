"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Only same-origin paths, as in middleware.ts. */
function safeRedirectPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

/**
 * Staging's sign-in: a developer email and the fixed staging code, no email
 * sent. The route checks both and hands back a Clerk ticket. Shown instead of
 * Clerk's <SignIn /> only when lib/staging-sign-in.ts says staging is on.
 */
export function StagingSignIn() {
  const t = useTranslations("signIn.staging");
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/staging-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) {
        const { error: reason } = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          reason === "wrong_code"
            ? t("wrongCode")
            : reason === "not_a_developer"
              ? t("notADeveloper")
              : t("failed"),
        );
        return;
      }
      const { ticket } = (await response.json()) as { ticket: string };
      const attempt = await signIn.create({ strategy: "ticket", ticket });
      await setActive({ session: attempt.createdSessionId });
      // A full load, so the middleware sees the new session and checks the roster.
      window.location.assign(
        safeRedirectPath(
          new URLSearchParams(window.location.search).get("redirect_url"),
        ),
      );
    } catch (cause) {
      console.error("Staging sign-in failed", cause);
      setError(t("failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("notice")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="staging-email">{t("email")}</Label>
        <Input
          id="staging-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="staging-code">{t("code")}</Label>
        <Input
          id="staging-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!isLoaded || pending}>
        {t("submit")}
      </Button>
    </form>
  );
}

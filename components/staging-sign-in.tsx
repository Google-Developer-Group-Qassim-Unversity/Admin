"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { arSA, enUS } from "@clerk/localizations";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** The fixed staging code (STAGING_OTP); the boxes are drawn for this many digits. */
const CODE_LENGTH = 4;
/** What Clerk's code step names: the Clerk application, as on the real page. */
const APPLICATION_NAME = "GDG-Authentication";
/** The Clerk application's logo, as Clerk's own page shows it. */
const LOGO_URL =
  "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzM1cDkwWklZV2Zic2VGWndEUllhMTJmV29jRyJ9?width=400";

/** Only same-origin paths, as in middleware.ts. */
function safeRedirectPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function redirectTarget(): string {
  return safeRedirectPath(new URLSearchParams(window.location.search).get("redirect_url"));
}

/** A localization entry as a plain string; Clerk types them as deep partials. */
function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/** Clerk's own wording, so this reads exactly like its sign-in in both languages. */
function useClerkCopy() {
  const ar = useLocale() === "ar";
  const l = ar ? arSA : enUS;
  return {
    google: text(l.socialButtonsBlockButton, "Continue with {{provider|titleize}}").replace("{{provider|titleize}}", "Google"),
    or: text(l.dividerText, "or"),
    emailLabel: text(l.formFieldLabel__emailAddress, "Email address"),
    emailPlaceholder: text(enUS.formFieldInputPlaceholder__emailAddress, "Enter your email address"),
    continue: text(l.formButtonPrimary, "Continue"),
    codeTitle: text(l.signIn?.emailCode?.title, "Check your email"),
    codeSubtitle: text(l.signIn?.emailCode?.subtitle, "to continue to {{applicationName}}").replace(
      "{{applicationName}}",
      APPLICATION_NAME,
    ),
    codeLabel: text(l.signIn?.emailCode?.formTitle, "Verification code"),
    resend: text(l.signIn?.emailCode?.resendButton, "Didn't receive a code? Resend"),
    anotherMethod: text(l.footerActionLink__useAnotherMethod, "Use another method"),
    notFound: ar ? text(arSA.unstable__errors?.form_identifier_not_found, "Couldn't find your account.") : "Couldn't find your account.",
    incorrect: ar ? "الرمز غير صحيح" : "Incorrect code",
    securedBy: ar ? "محمي بواسطة" : "Secured by",
  };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

function ClerkWordmark() {
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold tracking-tight text-[#212126]/65 dark:text-white/65">
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      </svg>
      clerk
    </span>
  );
}

const card = "flex flex-col gap-8 px-10 py-8 text-[#212126] dark:text-white";
const primaryButton =
  "flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[#2f3037] bg-gradient-to-b from-white/10 to-transparent px-3 text-[13px] font-medium text-white shadow-[0_0_0_1px_#2f3037,inset_0_1px_1px_rgba(255,255,255,0.07),0_2px_3px_rgba(34,42,53,0.2),0_1px_1px_rgba(0,0,0,0.24)] transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:from-transparent dark:text-[#212126] dark:shadow-none";
const subtle = "text-[13px] leading-[18px] text-[#212126]/65 dark:text-white/65";

function Caret() {
  return (
    <svg viewBox="0 0 16 16" className="size-2.5 opacity-60 rtl:rotate-180" aria-hidden>
      <path fill="currentColor" d="M5 3.5v9l7-4.5-7-4.5Z" />
    </svg>
  );
}

/**
 * Staging's sign-in: Clerk's two screens, redrawn, so it looks and flows like
 * production - except that no email is sent and the code is always the
 * staging one (8888). Google goes through Clerk for real.
 *
 * The email step asks /api/staging-sign-in whether the address may sign in;
 * the code step exchanges email + code for a Clerk ticket. Shown instead of
 * Clerk's <SignIn /> only when lib/staging-sign-in.ts says staging is on.
 */
export function StagingSignIn() {
  const pathname = usePathname();
  if (pathname.endsWith("/sso-callback")) {
    return <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" />;
  }
  return <StagingSignInFlow />;
}

function StagingSignInFlow() {
  const t = useTranslations("signIn");
  const copy = useClerkCopy();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code" && error) codeInput.current?.focus();
  }, [step, error]);

  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendIn]);

  async function post(body: { email: string; code?: string }) {
    const response = await fetch("/api/staging-sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; ticket?: string };
    return { ok: response.ok, ...data };
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await post({ email });
      if (!result.ok) {
        setError(copy.notFound);
        return;
      }
      setCode("");
      setResendIn(30);
      setStep("code");
    } catch {
      setError(copy.notFound);
    } finally {
      setPending(false);
    }
  }

  async function submitCode(value: string) {
    if (!isLoaded || value.length < CODE_LENGTH) return;
    setPending(true);
    setError(null);
    try {
      const result = await post({ email, code: value });
      if (!result.ok || !result.ticket) {
        setError(copy.incorrect);
        setCode("");
        codeInput.current?.focus();
        return;
      }
      const attempt = await signIn.create({ strategy: "ticket", ticket: result.ticket });
      await setActive({ session: attempt.createdSessionId });
      // A full load, so the middleware sees the new session and checks the roster.
      window.location.assign(redirectTarget());
    } catch (cause) {
      console.error("Staging sign-in failed", cause);
      setError(copy.incorrect);
      setCode("");
    } finally {
      setPending(false);
    }
  }

  async function continueWithGoogle() {
    if (!isLoaded) return;
    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sign-in/sso-callback",
      redirectUrlComplete: redirectTarget(),
    });
  }

  if (step === "code") {
    return (
      <div className={card}>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-sans text-[17px] leading-6 font-bold">{copy.codeTitle}</h1>
          <p className={subtle}>{copy.codeSubtitle}</p>
          <p className={`${subtle} flex items-center gap-2`}>
            <span dir="ltr">{email}</span>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="text-[#212126] hover:opacity-70 dark:text-white"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                  d="M10.5 2.5l3 3-8 8H2.5v-3l8-8ZM9 4l3 3"
                />
              </svg>
            </button>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <label className="relative flex gap-2" dir="ltr" aria-label={copy.codeLabel}>
            <input
              ref={codeInput}
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="\d*"
              maxLength={CODE_LENGTH}
              value={code}
              readOnly={pending}
              aria-label={copy.codeLabel}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                if (pending) return;
                setCode(digits);
                setError(null);
                if (digits.length === CODE_LENGTH) void submitCode(digits);
              }}
              className="absolute inset-0 z-10 cursor-text opacity-0"
            />
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`flex size-10 items-center justify-center rounded-md bg-white text-[17px] font-medium dark:bg-white/5 ${
                  error
                    ? "shadow-[0_0_0_1px_#ef4444]"
                    : i === Math.min(code.length, CODE_LENGTH - 1) && !pending
                      ? "shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_4px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                      : "shadow-[0_0_0_1px_rgba(0,0,0,0.11),0_0_1px_rgba(0,0,0,0.07)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                }`}
              >
                {code[i] ?? ""}
              </span>
            ))}
          </label>
          {error ? (
            <p role="alert" className="text-[13px] leading-[18px] text-[#ef4444]">
              {error}
            </p>
          ) : (
            <button
              type="button"
              disabled={resendIn > 0}
              onClick={() => setResendIn(30)}
              className={`${subtle} disabled:opacity-60`}
            >
              {copy.resend}
              {resendIn > 0 ? ` (${resendIn})` : ""}
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => void submitCode(code)}
            className={primaryButton}
          >
            {copy.continue}
            <Caret />
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="text-[13px] font-medium hover:opacity-70"
          >
            {copy.anotherMethod}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- Clerk's hosted logo, as its own page loads it */}
        <img src={LOGO_URL} alt="" className="size-12" />
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-[17px] leading-6 font-bold">{t("title")}</h1>
          <p className={subtle}>{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => void continueWithGoogle()}
          className="flex h-8 w-full items-center justify-center gap-4 rounded-md px-3 text-[13px] font-medium text-black/60 shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_2px_3px_-1px_rgba(0,0,0,0.08),0_1px_0_rgba(0,0,0,0.02)] hover:bg-black/[0.03] dark:text-white/80 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.15)] dark:hover:bg-white/5"
        >
          <GoogleIcon />
          {copy.google}
        </button>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-black/[0.07] dark:bg-white/10" />
          <span className={subtle}>{copy.or}</span>
          <span className="h-px flex-1 bg-black/[0.07] dark:bg-white/10" />
        </div>

        <form onSubmit={submitEmail} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="staging-email" className="text-[13px] leading-[18px] font-medium">
              {copy.emailLabel}
            </label>
            <input
              id="staging-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder={copy.emailPlaceholder}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              className={`h-8 w-full rounded-md bg-white px-3 text-[13px] text-[#131316] outline-none placeholder:text-black/40 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 ${
                error
                  ? "shadow-[0_0_0_1px_#ef4444]"
                  : "shadow-[0_0_0_1px_rgba(0,0,0,0.11),0_0_1px_rgba(0,0,0,0.07)] focus:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_4px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
              }`}
            />
            {error && (
              <p role="alert" className="text-[13px] leading-[18px] text-[#ef4444]">
                {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={pending} className={primaryButton}>
            {copy.continue}
            <Caret />
          </button>
        </form>
      </div>
    </div>
  );
}

/** The grey "Secured by Clerk" strip under Clerk's card. */
export function StagingSignInFooter() {
  const copy = useClerkCopy();
  return (
    <div className="flex items-center justify-center gap-1.5 bg-black/[0.03] py-4 text-xs font-medium text-[#212126]/65 dark:bg-white/5 dark:text-white/65">
      {copy.securedBy}
      <ClerkWordmark />
    </div>
  );
}

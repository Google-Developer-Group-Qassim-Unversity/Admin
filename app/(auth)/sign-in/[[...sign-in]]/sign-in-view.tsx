"use client";

import { SignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

import { AppBackground, BrandMark, BrandRail } from "@/components/brand-mark";
import { StagingSignIn, StagingSignInFooter } from "@/components/staging-sign-in";

/**
 * The admin app's own sign-in. Clerk's flow runs here, on this origin, rather
 * than bouncing to the member app and back. The catch-all segment carries
 * Clerk's sub-steps (/sign-in/factor-one, /sign-in/sso-callback, ...).
 *
 * The heading text comes from the `signIn` messages, set on the provider
 * (clerk-provider-wrapper.tsx) so it is not the Clerk application's name.
 *
 * Signing in only proves who you are: the middleware still checks the roster
 * afterwards, so there is no sign-up link - staff already have an account.
 *
 * On staging, `staging` swaps Clerk's flow for a redrawn copy of it whose
 * emailed code is always 8888 (lib/staging-sign-in.ts); page.tsx decides, at
 * request time.
 */
export function SignInView({ staging }: { staging: boolean }) {
  const tNav = useTranslations("nav");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <AppBackground />

      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <BrandMark size={30} />
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-[15px] leading-tight font-bold tracking-tight">
              GDG Qassim
            </span>
            <span className="text-muted-foreground text-[11.5px] leading-tight">
              {tNav("consoleLabel")}
            </span>
          </div>
        </div>

        <div className="bg-card border-border overflow-hidden rounded-xl border">
          <BrandRail />
          {staging ? (
            <>
              <StagingSignIn />
              <StagingSignInFooter />
            </>
          ) : (
            <SignIn
              routing="path"
              path="/sign-in"
              fallbackRedirectUrl="/"
              appearance={{
                elements: {
                  // `!` because Clerk's own styles otherwise win; our wrapper is the card.
                  rootBox: "w-full!",
                  cardBox:
                    "w-full! max-w-none! rounded-none! border-0! shadow-none!",
                  card: "w-full! rounded-none! border-0! bg-transparent! shadow-none!",
                  // Staff never sign up here.
                  footerAction: "hidden",
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

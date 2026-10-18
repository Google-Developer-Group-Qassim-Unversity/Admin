import 'server-only';

/**
 * Staging's fixed sign-in code, so nobody waits for a Clerk email there.
 *
 * On only when `STAGING_OTP` is set (Infisical `staging` alone sets it). Any
 * email may sign in with it; the permissions system then decides, as on
 * production, so only current staff get past the middleware.
 *
 * It also refuses a live Clerk key. Staging signs in against Clerk's
 * development instance; a session minted on the production instance would be
 * a session on admin.gdg-q.com too, so a stray `STAGING_OTP` in prod must do
 * nothing. See Backend/docs/STAGING.md.
 */
export function stagingSignIn(): { code: string } | null {
  const code = process.env.STAGING_OTP;
  if (!code) return null;

  if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    console.error('STAGING_OTP is set but Clerk is a live instance; ignoring it');
    return null;
  }

  return { code };
}

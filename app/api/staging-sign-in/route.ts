import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { stagingSignIn } from '@/lib/staging-sign-in';

/** Current staff (or a super admin), per the backend's staging-only check. */
async function isStaff(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${config.backendApiUrl}/access/staging-sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { is_staff?: unknown };
    return body.is_staff === true;
  } catch (cause) {
    console.error('Staging staff check failed', cause);
    return false;
  }
}

/**
 * Exchange a staff or developer email and the fixed staging code for a Clerk sign-in
 * ticket, which the sign-in page redeems with `signIn.create({ strategy: 'ticket' })`.
 * Without a code it only answers whether the email may sign in, for the
 * page's email step. See lib/staging-sign-in.ts for when this exists at all.
 */
export async function POST(request: Request) {
  const staging = stagingSignIn();
  if (!staging) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    code?: unknown;
  } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!email || (!staging.emails.includes(email) && !(await isStaff(email)))) {
    return NextResponse.json({ error: 'not_staff' }, { status: 403 });
  }
  if (body?.code === undefined) {
    return NextResponse.json({ ok: true });
  }
  if (code !== staging.code) {
    return NextResponse.json({ error: 'wrong_code' }, { status: 401 });
  }

  const clerk = await clerkClient();
  const { data: existing } = await clerk.users.getUserList({
    emailAddress: [email],
  });
  const user =
    existing[0] ??
    (await clerk.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
    }));

  // The development instance's session token carries publicMetadata but no
  // email claim, and the backend finds a member it has not seen under this
  // Clerk id by `metadata.email` (Backend/app/helpers.py, resolve_member).
  await clerk.users.updateUserMetadata(user.id, { publicMetadata: { email } });

  const token = await clerk.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 60,
  });
  return NextResponse.json({ ticket: token.token });
}

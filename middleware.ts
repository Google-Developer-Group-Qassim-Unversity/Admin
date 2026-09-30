import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { ACCESS_COOKIE, ACCESS_COOKIE_MAX_AGE_S, readAccessCookie, signAccessCookie } from '@/lib/access-cookie';
import { config as envConfig } from '@/lib/config';

const isPublicRoute = createRouteMatcher([
  '/access-denied(.*)',
  '/events/:id/attend',
]);

const isApiRoute = createRouteMatcher(['/api/(.*)']);

/**
 * The door: only staff (on the current semester's roster, or a super admin)
 * get in, as the backend's GET /access/me says. Everyone else is denied, on
 * every page. What each page allows is up to the page and the backend.
 */
export default clerkMiddleware(async (auth, req) => {
  const { userId, getToken } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  if (!userId) {
    const signInUrl = `${envConfig.authFrontendUrl}/sign-in?redirect_url=${encodeURIComponent(envConfig.thisAppUrl + req.nextUrl.pathname)}`;
    return NextResponse.redirect(signInUrl);
  }

  let isStaff = await readAccessCookie(req.cookies.get(ACCESS_COOKIE)?.value, userId);
  let freshCookie: string | null = null;

  if (isStaff === null) {
    try {
      const token = await getToken();
      const response = await fetch(`${envConfig.backendApiUrl}/access/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`GET /access/me returned ${response.status}`);
      const body = (await response.json()) as { is_staff?: boolean };
      isStaff = body.is_staff === true;
      freshCookie = await signAccessCookie(userId, isStaff);
    } catch (error) {
      // Fail closed, and do not remember the failure.
      console.error('Could not check access', error);
      return NextResponse.redirect(new URL('/access-denied?reason=unavailable', req.url));
    }
  }

  const response = isStaff
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/access-denied?reason=not_staff', req.url));

  if (freshCookie) {
    response.cookies.set(ACCESS_COOKIE, freshCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE_S,
    });
  }
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

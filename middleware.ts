import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ROUTE_PERMISSIONS, getRoleFromMetadata, type Role } from '@/lib/role-based-access';
import { config as envConfig } from '@/lib/config';

const isPublicRoute = createRouteMatcher([
  '/access-denied(.*)',
  '/events/:id/attend',
]);

const isApiRoute = createRouteMatcher(['/api/(.*)']);

// The events pipeline is open to department leaders, VPs and the members they
// gave access to, who are not admins. The backend decides what each can do.
const isPipelineRoute = createRouteMatcher(['/pipeline(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

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

  // Role flags come off the session JWT's "metadata" claim (Clerk Dashboard >
  // Sessions > customize session token mirrors publicMetadata into it)
  // instead of a live clerkClient().users.getUser() call, which used to run
  // on every navigation.
  const userRole = getRoleFromMetadata(sessionClaims?.metadata ?? {});

  if (userRole === 'none') {
    if (isPipelineRoute(req)) {
      return NextResponse.next();
    }
    if (req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/pipeline', req.url));
    }
    return NextResponse.redirect(new URL('/access-denied?reason=not_admin', req.url));
  }

  for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (req.nextUrl.pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL('/access-denied?reason=not_authorized', req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

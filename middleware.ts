import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ROUTE_PERMISSIONS, getRoleFromMetadata, type Role } from '@/lib/role-based-access';

const isPublicRoute = createRouteMatcher([
  '/access-denied(.*)',
  '/events/:id/attend',
]);

const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  if (!userId) {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!authUrl || !appUrl) {
      console.error('Missing NEXT_PUBLIC_AUTH_URL or NEXT_PUBLIC_APP_URL environment variables');
      return NextResponse.redirect(new URL('/access-denied?reason=config', req.url));
    }
    
    const signInUrl = `${authUrl}/sign-in?redirect_url=${encodeURIComponent(appUrl + req.nextUrl.pathname)}`;
    return NextResponse.redirect(signInUrl);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as {
    is_admin?: boolean;
    is_super_admin?: boolean;
    is_admin_points?: boolean;
  };

  const userRole = getRoleFromMetadata(publicMetadata);

  if (userRole === 'none') {
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

import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
// In this admin app, we have NO public routes - everything requires auth
const isPublicRoute = createRouteMatcher([
  '/access-denied(.*)',
]);

// Define routes that are API routes (for special handling)
const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Allow access-denied page without auth to prevent redirect loops
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For API routes, we'll handle auth differently
  // Don't block API routes in middleware - they'll handle their own auth where needed
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!userId) {
    // Redirect to auth app for sign-in
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!authUrl || !appUrl) {
      console.error('Missing NEXT_PUBLIC_AUTH_URL or NEXT_PUBLIC_APP_URL environment variables');
      return NextResponse.redirect(new URL('/access-denied?reason=config', req.url));
    }
    
    const signInUrl = `${authUrl}/sign-in?redirect_url=${encodeURIComponent(appUrl + req.nextUrl.pathname)}`;
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated, now check if they're an admin
  // We need to fetch the user to get publicMetadata (it's not in session claims by default)
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata || undefined;
  console.log('User publicMetadata:', publicMetadata);

  const isAdmin = publicMetadata?.is_admin === true;

  if (!isAdmin) {
    // User is authenticated but not an admin
    return NextResponse.redirect(new URL('/access-denied?reason=not_admin', req.url));
  }

  // User is authenticated and is an admin - allow access
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

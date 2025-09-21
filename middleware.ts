import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/unauthorized(.*)',
  '/api/webhooks(.*)', // For Clerk webhooks if needed
]);

// Block any Clerk signup routes
const isSignupRoute = createRouteMatcher([
  '/sign-up(.*)',
  '/signup(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Block signup routes and redirect to unauthorized page
  if (isSignupRoute(req)) {
    const unauthorizedUrl = new URL('/unauthorized', req.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Get auth state
  const { userId } = await auth();

  // Redirect unauthorized users to login
  if (!userId) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Allow authenticated users to proceed
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
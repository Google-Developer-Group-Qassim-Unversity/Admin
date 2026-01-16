import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Check if the current user is an admin based on their publicMetadata.
 * Returns the user ID if they are an admin, null otherwise.
 * Use this in API routes that require admin access.
 */
export async function requireAdmin(): Promise<{
  userId: string;
  isAdmin: true;
} | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user to get publicMetadata (not included in session claims by default)
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as { is_admin?: boolean } | undefined;
  const isAdmin = publicMetadata?.is_admin === true;

  if (!isAdmin) {
    return null;
  }

  return { userId, isAdmin: true };
}

/**
 * Get the current authenticated user's info.
 * Returns null if not authenticated.
 * Use this in API routes that need to check auth status.
 */
export async function getAuthUser(): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user to get publicMetadata (not included in session claims by default)
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as { is_admin?: boolean } | undefined;
  const isAdmin = publicMetadata?.is_admin === true;

  return { userId, isAdmin };
}

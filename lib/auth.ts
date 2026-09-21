import { auth } from "@clerk/nextjs/server";

type AdminMetadata = {
  is_admin?: boolean;
  is_super_admin?: boolean;
  is_admin_points?: boolean;
};

function isAdminFromMetadata(metadata: AdminMetadata | undefined): boolean {
  return metadata?.is_admin === true || metadata?.is_super_admin === true || metadata?.is_admin_points === true;
}

// Role flags are read off the session JWT's "metadata" claim (configured in
// Clerk Dashboard > Sessions > customize session token to mirror
// publicMetadata) rather than a live clerkClient().users.getUser() call,
// which used to run on every request.

export async function requireAdmin(): Promise<{
  userId: string;
  isAdmin: true;
} | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  if (!isAdminFromMetadata(sessionClaims?.metadata)) {
    return null;
  }

  return { userId, isAdmin: true };
}

export async function requireSuperAdmin(): Promise<{
  userId: string;
  isSuperAdmin: true;
} | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  if (sessionClaims?.metadata?.is_super_admin !== true) {
    return null;
  }

  return { userId, isSuperAdmin: true };
}

export async function getAuthUser(): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  return { userId, isAdmin: isAdminFromMetadata(sessionClaims?.metadata) };
}

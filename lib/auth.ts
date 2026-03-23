import { auth, clerkClient } from "@clerk/nextjs/server";

type AdminMetadata = {
  is_admin?: boolean;
  is_super_admin?: boolean;
  is_admin_points?: boolean;
};

function isAdminFromMetadata(metadata: AdminMetadata | undefined): boolean {
  return metadata?.is_admin === true || metadata?.is_super_admin === true || metadata?.is_admin_points === true;
}

export async function requireAdmin(): Promise<{
  userId: string;
  isAdmin: true;
} | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as AdminMetadata | undefined;

  if (!isAdminFromMetadata(publicMetadata)) {
    return null;
  }

  return { userId, isAdmin: true };
}

export async function getAuthUser(): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as AdminMetadata | undefined;

  return { userId, isAdmin: isAdminFromMetadata(publicMetadata) };
}

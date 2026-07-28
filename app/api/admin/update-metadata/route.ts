import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const publicMetadata = currentUser.publicMetadata as
      | { is_super_admin?: boolean }
      | undefined;
    const isSuperAdmin = publicMetadata?.is_super_admin === true;

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { clerkUserId, uni_id, role } = body;

    if ((!clerkUserId && !uni_id) || !role) {
      return NextResponse.json(
        { error: "clerkUserId (or legacy uni_id) and role are required" },
        { status: 400 }
      );
    }

    // Preferred path: look the Clerk user up directly by id. Works for every
    // member regardless of sign-in method (uni_id/password or Google).
    let targetUser = clerkUserId
      ? await client.users.getUser(clerkUserId).catch(() => null)
      : null;

    // Legacy fallback: members created before clerk_user_id existed (and who
    // haven't re-authenticated since) only have their uni_id-derived email to
    // go on.
    if (!targetUser && uni_id) {
      const email = `${uni_id}@qu.edu.sa`;
      const users = await client.users.getUserList({
        emailAddress: [email],
      });
      targetUser = users.data?.[0] ?? null;
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          error: "User not found in authentication system",
          warning: true,
        },
        { status: 404 }
      );
    }
    const existingMetadata = { ...(targetUser.publicMetadata || {}) };

    // Update metadata based on role
    if (role === "admin") {
      existingMetadata.is_admin = true;
      // Don't modify is_super_admin or is_admin_points
    } else if (role === "admin_points") {
      existingMetadata.is_admin = true;
      existingMetadata.is_admin_points = true;
      // Don't set is_super_admin
    } else if (role === "super_admin") {
      existingMetadata.is_admin = true;
      existingMetadata.is_super_admin = true;
      existingMetadata.is_admin_points = true;
    } else if (role === "none") {
      // Remove admin-related fields only
      delete existingMetadata.is_admin;
      delete existingMetadata.is_super_admin;
      delete existingMetadata.is_admin_points;
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Update user metadata
    await client.users.updateUser(targetUser.id, {
      publicMetadata: existingMetadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating admin metadata:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update admin metadata",
      },
      { status: 500 }
    );
  }
}

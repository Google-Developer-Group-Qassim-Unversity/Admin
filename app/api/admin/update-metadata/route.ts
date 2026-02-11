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
    const { uni_id, role } = body;

    if (!uni_id || !role) {
      return NextResponse.json(
        { error: "uni_id and role are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const email = `${uni_id}@qu.edu.sa`;
    const users = await client.users.getUserList({
      emailAddress: [email],
    });

    if (!users.data || users.data.length === 0) {
      return NextResponse.json(
        {
          error: "User not found in authentication system",
          warning: true,
        },
        { status: 404 }
      );
    }

    const targetUser = users.data[0];
    const existingMetadata = { ...(targetUser.publicMetadata || {}) };

    // Update metadata based on role
    if (role === "admin") {
      existingMetadata.is_admin = true;
      // Don't modify is_super_admin
    } else if (role === "super_admin") {
      existingMetadata.is_admin = true;
      existingMetadata.is_super_admin = true;
    } else if (role === "none") {
      // Remove admin-related fields only
      delete existingMetadata.is_admin;
      delete existingMetadata.is_super_admin;
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

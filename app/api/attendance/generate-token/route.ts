import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth, clerkClient } from '@clerk/nextjs/server';

const JWT_SECRET = process.env.JWT_SECRET;
const MEMBER_APP_URL = process.env.NEXT_PUBLIC_MEMBER_APP_URL;

interface TokenPayload {
  eventId: number;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  // look for is_admin in publicMetadata
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as { is_admin?: boolean } | undefined;
  const isAdmin = publicMetadata?.is_admin === true;
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check for JWT_SECRET
  if (!JWT_SECRET || !MEMBER_APP_URL) {
    console.error('JWT_SECRET or MEMBER_APP_URL environment variable is not set');
    return NextResponse.json(
      { error: 'Server configuration error: JWT_SECRET or MEMBER_APP_URL is not set' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { eventId, expirationMinutes } = body;

    // Validate input
    if (!eventId || typeof eventId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid eventId' },
        { status: 400 }
      );
    }

    if (!expirationMinutes || typeof expirationMinutes !== 'number' || expirationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Invalid expirationMinutes' },
        { status: 400 }
      );
    }

    // Calculate expiration timestamp
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expirationMinutes * 60);

    // Create JWT payload
    const payload: TokenPayload = {
      eventId,
      iat: now,
      exp,
    };

    // Sign the token
    const token = jwt.sign(payload, JWT_SECRET);

    // Build the attendance URL
    const appUrl = process.env.NEXT_PUBLIC_MEMBER_APP_URL;
    const attendanceUrl = `${appUrl}/events/${eventId}/attendance?token=${token}`;

    // Calculate expiration date
    const expiresAt = new Date(exp * 1000).toISOString();

    return NextResponse.json({
      token,
      expiresAt,
      attendanceUrl,
    });
  } catch (error) {
    console.error('Error generating attendance token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { config } from '@/lib/config';
import { serverConfig } from '@/lib/config-server';

interface TokenPayload {
  eventId: number;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
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

  try {
    const body = await request.json();
    const { eventId, expirationMinutes } = body;

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

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expirationMinutes * 60);

    const payload: TokenPayload = {
      eventId,
      iat: now,
      exp,
    };

    const token = jwt.sign(payload, serverConfig.attendanceJwtSecret);

    const attendanceUrl = `${config.memberAppUrl}/events/${eventId}/attendance?token=${token}`;

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

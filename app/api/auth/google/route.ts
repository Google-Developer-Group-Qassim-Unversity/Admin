import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    // Optional: when we already know the admin's Google identity via Clerk,
    // this skips Google's account-chooser step and jumps straight to consent.
    // Doesn't request or rely on any scope Clerk's own sign-in connection has -
    // this is still our app's own, separately-scoped OAuth client.
    const loginHint = searchParams.get('login_hint') || undefined;

    const oauth2Client = getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/forms.body',
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      login_hint: loginHint,
      state: eventId || undefined, // Pass eventId as state
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}

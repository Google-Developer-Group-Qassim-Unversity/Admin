import { NextResponse } from 'next/server';
import { clearTokensFromCookies, getTokensFromCookies, getOAuth2Client } from '@/lib/google-api';

export async function POST() {
  try {
    // Get tokens before clearing them
    const tokens = await getTokensFromCookies();
    
    // Clear tokens from cookies first
    await clearTokensFromCookies();
    
    // Revoke the access token with Google if it exists
    if (tokens?.access_token) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials(tokens);
        await oauth2Client.revokeCredentials();
      } catch (revokeError) {
        // Log but don't fail the disconnect if revoke fails
        console.error('Error revoking credentials:', revokeError);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}

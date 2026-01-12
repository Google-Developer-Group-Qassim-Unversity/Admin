import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client, setTokensInCookies } from '@/lib/google-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=access_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    await setTokensInCookies(tokens);
    
    return NextResponse.redirect(new URL('/?auth=success', request.url));
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}

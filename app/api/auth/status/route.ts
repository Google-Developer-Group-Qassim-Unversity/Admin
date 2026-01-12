import { NextRequest, NextResponse } from 'next/server';
import { 
  getTokensFromCookies, 
  getUserInfo, 
  isTokenExpired,
  getRefreshTokenFromBackend,
  refreshAccessToken,
  setTokensInCookies
} from '@/lib/google-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventIdParam = searchParams.get('eventId');
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : null;

  // First check cookies
  let tokens = await getTokensFromCookies();
  
  // If no tokens or expired, try to get from backend using eventId
  if ((!tokens || isTokenExpired(tokens)) && eventId) {
    const refreshToken = await getRefreshTokenFromBackend(eventId);
    if (refreshToken) {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens) {
        tokens = newTokens;
        await setTokensInCookies(tokens);
      }
    }
  }
  
  if (!tokens) {
    return NextResponse.json({ authenticated: false });
  }

  // Check if tokens are still expired after refresh attempt
  if (isTokenExpired(tokens)) {
    return NextResponse.json({ authenticated: false, reason: 'token_expired' });
  }

  try {
    const userInfo = await getUserInfo(eventId || undefined);
    return NextResponse.json({ 
      authenticated: true,
      user: userInfo 
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Failed to fetch user info'
    });
  }
}

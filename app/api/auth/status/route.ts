import { NextResponse } from 'next/server';
import { getTokensFromCookies, getUserInfo } from '@/lib/google-api';

export async function GET() {
  const tokens = await getTokensFromCookies();
  
  if (!tokens) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const userInfo = await getUserInfo();
    return NextResponse.json({ 
      authenticated: true,
      user: userInfo 
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({ 
      authenticated: true,
      error: 'Failed to fetch user info'
    });
  }
}

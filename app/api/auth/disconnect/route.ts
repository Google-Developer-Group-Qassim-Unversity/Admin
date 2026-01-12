import { NextResponse } from 'next/server';
import { clearTokensFromCookies } from '@/lib/google-api';

export async function POST() {
  try {
    await clearTokensFromCookies();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}

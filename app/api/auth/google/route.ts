import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-api';

export async function GET() {
  try {
    const url = await getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}

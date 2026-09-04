import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { serverConfig } from '@/lib/config-server';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    url: `https://docs.google.com/forms/d/${serverConfig.templateFormFileId}/edit`,
  });
}

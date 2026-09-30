import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { serverConfig } from '@/lib/config-server';

export async function GET() {
  const allowed = await requirePermission('settings.template_form');
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    url: `https://docs.google.com/forms/d/${serverConfig.templateFormFileId}/edit`,
  });
}

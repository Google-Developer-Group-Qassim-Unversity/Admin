import { NextResponse } from 'next/server';
import { copyDriveFile } from '@/lib/google-api';

export async function POST() {
  try {
    const fileId = process.env.FILE_ID;
    
    if (!fileId) {
      return NextResponse.json({ error: 'FILE_ID not configured' }, { status: 400 });
    }

    const result = await copyDriveFile(fileId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error copying file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to copy file' },
      { status: 500 }
    );
  }
}

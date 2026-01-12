import { NextResponse } from 'next/server';
import { listDriveFiles } from '@/lib/google-api';

/**
 * Configure the number of files to print in the console
 */
const PRINT_LIMIT = 5;

export async function GET() {
  try {
    const files = await listDriveFiles(100); 
    if (!files || files.length === 0) {
        return NextResponse.json({ message: 'No files found' });
    }

    console.log(`--- Google Drive Files (Top ${PRINT_LIMIT}) ---`);
    files.slice(0, PRINT_LIMIT).forEach((file, index) => {
    console.log(`${index + 1}. Name: ${file.name} | ID: ${file.id} | Type: ${file.mimeType}`);
    });
    console.log('------------------------------------------');

    return NextResponse.json({
      message: `Printed top ${PRINT_LIMIT} files to console`,
      totalFound: files.length,
      printedCount: Math.min(files.length, PRINT_LIMIT),
      files: files.slice(0, PRINT_LIMIT)
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    );
  }
}

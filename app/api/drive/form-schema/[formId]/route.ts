import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated OAuth2 client
    const oauth2Client = await getAuthenticatedClient();
    
    if (!oauth2Client) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect your Google account first.' },
        { status: 401 }
      );
    }
    // Initialize Google Forms API
    const forms = google.forms({ version: 'v1', auth: oauth2Client });

    // Get the form schema
    const { data } = await forms.forms.get({ formId });

    console.log(`--- Schema for Form ID: ${formId} ---`);
    console.log(`Title: ${data.info?.title}`);
    console.log(`Document Title: ${data.info?.documentTitle}`);
    console.log(`Number of Items: ${data.items?.length || 0}`);
    console.log('------------------------------------------');

    return NextResponse.json({
      success: true,
      formId,
      schema: data,
      info: data.info,
      items: data.items || [],
      itemsCount: data.items?.length || 0,
    });
  } catch (error) {
    console.error('Error getting form schema:', error);
    
    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
      if (error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Form not found or you do not have access to it.' },
          { status: 404 }
        );
      }
      if (error.message.includes('403')) {
        return NextResponse.json(
          { error: 'Permission denied. You do not have access to this form.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get form schema',
        success: false
      },
      { status: 500 }
    );
  }
}

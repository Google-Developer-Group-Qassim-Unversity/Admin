import { NextRequest, NextResponse } from 'next/server';
import { publishForm, checkFormPublished, getAuthenticatedClient } from '@/lib/google-api';

export async function POST(request: NextRequest) {
  try {
    const { eventId, formId } = await request.json();
    
    if (!eventId || !formId) {
      return NextResponse.json(
        { error: 'eventId and formId are required' },
        { status: 400 }
      );
    }

    // Check if we have authentication
    const oauth2Client = await getAuthenticatedClient(eventId);
    if (!oauth2Client) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    // Check if form is already published
    const isPublished = await checkFormPublished(formId, eventId);
    
    if (!isPublished) {
      // Publish the form
      await publishForm(formId, eventId);
    }

    return NextResponse.json({ 
      success: true,
      wasAlreadyPublished: isPublished 
    });
  } catch (error) {
    console.error('Error publishing form:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish form' },
      { status: 500 }
    );
  }
}

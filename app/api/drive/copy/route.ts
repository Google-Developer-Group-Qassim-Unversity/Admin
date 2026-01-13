import { NextRequest, NextResponse } from 'next/server';
import { copyDriveFile, setFormIdInCookies } from '@/lib/google-api';
import { updateForm, getFormByEventId } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventId = body.eventId ? parseInt(body.eventId, 10) : null;
    
    const templateFileId = process.env.TEMPLATE_FROM_FILE_ID;
    
    if (!templateFileId) {
      return NextResponse.json({ error: 'FILE_ID not configured' }, { status: 400 });
    }
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const result = await copyDriveFile(templateFileId, eventId);
    
    // Store form ID in cookies for faster access
    if (result.id && result.name) {
      await setFormIdInCookies(eventId, result.id, result.name);
    }
    
    // Fetch current form data to get full object for update to DB
    const formResult = await getFormByEventId(eventId);
    if (formResult.success && result.id) {
      try {
        const currentForm = formResult.data;
        const updateResult = await updateForm(currentForm.id, {
          event_id: currentForm.event_id,
          google_form_id: result.id,
          refresh_token: currentForm.refresh_token,
        });
        
        if (!updateResult.success) {
          console.error('Failed to update form in backend:', updateResult.error.message);
        }
      } catch (backendError) {
        console.error('Error updating backend:', backendError);
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error copying file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to copy file' },
      { status: 500 }
    );
  }
}

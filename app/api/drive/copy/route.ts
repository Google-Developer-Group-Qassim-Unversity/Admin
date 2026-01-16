import { NextRequest, NextResponse } from 'next/server';
import { copyDriveFile, setFormIdInCookies, deleteDriveFile, registerFormWatch } from '@/lib/google-api';
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

    // Step 1: Copy the form template
    const result = await copyDriveFile(templateFileId, eventId);
    
    if (!result.id) {
      return NextResponse.json({ error: 'Failed to copy file - no ID returned' }, { status: 500 });
    }

    // Step 2: Register a watch for form responses
    try {
      await registerFormWatch(result.id, eventId);
      console.log(`Watch registered for form ${result.id}`);
    } catch (watchError) {
      console.error('Error registering form watch:', watchError);
      
      // Clean up: delete the copied file since watch registration failed
      try {
        await deleteDriveFile(result.id, eventId);
        console.log(`Cleaned up: deleted form ${result.id} after watch registration failure`);
      } catch (deleteError) {
        console.error('Error deleting file during cleanup:', deleteError);
      }
      
      const errorMessage = watchError instanceof Error ? watchError.message : 'Failed to register form watch';
      return NextResponse.json(
        { error: `Watch registration failed: ${errorMessage}. The form was not created.` },
        { status: 500 }
      );
    }
    
    // Step 3: Store form ID in cookies for faster access
    if (result.id && result.name) {
      await setFormIdInCookies(eventId, result.id, result.name);
    }
    
    // Step 4: Fetch current form data to get full object for update to DB
    const formResult = await getFormByEventId(eventId);
    if (formResult.success && result.id) {
      try {
        const currentForm = formResult.data;
        const updateResult = await updateForm(currentForm.id, {
          event_id: currentForm.event_id,
          form_type: 'google',
          google_form_id: result.id,
          google_refresh_token: currentForm.google_refresh_token,
          google_watch_id: null,
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

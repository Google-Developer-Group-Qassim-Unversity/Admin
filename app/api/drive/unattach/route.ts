import { NextRequest, NextResponse } from 'next/server';
import { clearFormIdFromCookies, clearTokensFromCookies, getTokensFromCookies, getOAuth2Client, deleteFormWatch } from '@/lib/google-api';
import { updateForm, getFormByEventId } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = body.eventId ? parseInt(body.eventId, 10) : null;
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Step 1: Get form data to retrieve watch ID and form ID
    const formResult = await getFormByEventId(eventId);
    
    // Step 2: Delete the watch if form exists and has google_form_id and google_watch_id
    if (formResult.success && formResult.data.google_form_id && formResult.data.google_watch_id) {
      try {
        await deleteFormWatch(formResult.data.google_form_id, formResult.data.google_watch_id, eventId);
        console.log(`Watch ${formResult.data.google_watch_id} deleted successfully`);
      } catch (watchError) {
        console.error('Error deleting watch:', watchError);
        // Continue with cleanup even if watch deletion fails
      }
    }

    // Step 3: Clear form ID from cookies
    await clearFormIdFromCookies(eventId);
    
    // Revoke Google tokens
    const tokens = await getTokensFromCookies();
    if (tokens?.access_token) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials(tokens);
        await oauth2Client.revokeCredentials();
      } catch (revokeError) {
        console.error('Error revoking credentials:', revokeError);
      }
    }
    
    // Step 5: Clear tokens from cookies
    await clearTokensFromCookies();
    
    // Step 6: Update form in backend: clear google_form_id, refresh_token, and set form_type to "none"
    if (formResult.success) {
      try {
        const currentForm = formResult.data;
        const updateResult = await updateForm(currentForm.id, {
          event_id: currentForm.event_id,
          form_type: 'none',
          google_form_id: null,
          google_refresh_token: null,
          google_watch_id: null,
        });
        
        if (!updateResult.success) {
          console.error('Failed to update form in backend:', updateResult.error.message);
        }
      } catch (backendError) {
        console.error('Error updating backend:', backendError);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error un-attaching form:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to un-attach form' },
      { status: 500 }
    );
  }
}

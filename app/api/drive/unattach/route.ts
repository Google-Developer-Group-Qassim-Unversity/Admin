import { NextRequest, NextResponse } from 'next/server';
import { clearTokensFromCookies, getTokensFromCookies, getOAuth2Client, deleteFormWatch } from '@/lib/google-api';
import { serverApi } from '@/lib/api/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = body.eventId ? parseInt(body.eventId, 10) : null;
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Step 1: Get form data to retrieve watch ID and form ID
    const api = await serverApi();
    const currentForm = await api.forms.forEvent(eventId).catch(() => null);
    
    // Step 2: Delete the watch if form exists and has google_form_id and google_watch_id
    if (currentForm?.google_form_id && currentForm.google_watch_id) {
      try {
        await deleteFormWatch(currentForm.google_form_id, currentForm.google_watch_id, eventId);
        console.log(`Watch ${currentForm.google_watch_id} deleted successfully`);
      } catch (watchError) {
        console.error('Error deleting watch:', watchError);
        // Continue with cleanup even if watch deletion fails
      }
    }

    // Step 3: Clear tokens from cookies for this session
    // Note: We don't revoke Google tokens here as the admin may want to use them for other forms
    await clearTokensFromCookies();
    
    // Step 4: Update form in backend: clear google_form_id, refresh_token, and set form_type to "none"
    if (currentForm) {
      try {
        await api.forms.update(currentForm.id, {
          event_id: currentForm.event_id,
          form_type: 'registration',
          google_form_id: null,
          google_refresh_token: null,
          google_watch_id: null,
          google_responders_url: null,
        });
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

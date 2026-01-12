import { NextRequest, NextResponse } from 'next/server';
import { clearFormIdFromCookies } from '@/lib/google-api';
import { updateForm, getFormByEventId } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = body.eventId ? parseInt(body.eventId, 10) : null;
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Clear form ID from cookies
    await clearFormIdFromCookies(eventId);
    
    // Fetch current form data to get full object for update
    const formResult = await getFormByEventId(eventId);
    if (formResult.success) {
      try {
        const currentForm = formResult.data;
        const updateResult = await updateForm(currentForm.id, {
          event_id: currentForm.event_id,
          google_form_id: null,
          refresh_token: currentForm.refresh_token,
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

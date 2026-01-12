import { NextRequest, NextResponse } from 'next/server';
import { getFormIdFromCookies, setFormIdInCookies } from '@/lib/google-api';
import { getFormByEventId } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventIdParam = searchParams.get('eventId');
    const eventId = eventIdParam ? parseInt(eventIdParam, 10) : null;
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // First try to get from cookies for faster access
    const cookieFormId = await getFormIdFromCookies(eventId);
    
    // Fetch from backend to get the authoritative data
    try {
      const result = await getFormByEventId(eventId);
      
      if (!result.success) {
        // No form exists for this event
        if (result.error.status === 404) {
          return NextResponse.json({ 
            hasForm: false,
            form: null 
          });
        }
        throw new Error(result.error.message);
      }
      
      const formData = result.data;
      
      // Update cookies if backend has form data
      if (formData.google_form_id) {
        // We don't have the form name from backend, so use a placeholder if needed
        // The cookies might already have the name from when the form was created
        await setFormIdInCookies(eventId, formData.google_form_id, 'Event Form');
      }
      
      return NextResponse.json({
        hasForm: true,
        form: {
          id: formData.id,
          eventId: formData.event_id,
          googleFormId: formData.google_form_id,
          formName: null,
        }
      });
    } catch (backendError) {
      console.error('Error fetching from backend:', backendError);
      
      // Fallback to cookie data if backend fails
      if (cookieFormId) {
        return NextResponse.json({
          hasForm: true,
          form: {
            googleFormId: cookieFormId,
            formName: null, // We don't have the name in this fallback
          },
          source: 'cache'
        });
      }
      
      return NextResponse.json({ 
        hasForm: false,
        form: null,
        error: 'Failed to fetch form data'
      });
    }
  } catch (error) {
    console.error('Error getting form:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get form' },
      { status: 500 }
    );
  }
}

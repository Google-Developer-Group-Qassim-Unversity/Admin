import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import { copyDriveFile, setFormIdInCookies, deleteDriveFile, registerFormWatch, getOAuth2Client } from '@/lib/google-api';
import { updateForm, getFormByEventId } from '@/lib/api';

export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  try {
    const body = await request.json().catch(() => ({}));
    const eventId = body.eventId ? parseInt(body.eventId, 10) : null;
    const refreshToken = body.refreshToken; // Optional: if provided, use this instead of cookies
    
    const templateFileId = process.env.TEMPLATE_FROM_FILE_ID;
    
    if (!templateFileId) {
      return NextResponse.json({ error: 'FILE_ID not configured' }, { status: 400 });
    }
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    let result;
    let formId: string | undefined;
    let formName: string | undefined;

    let oauth2Client;

    // If refresh token provided, use it directly (saved token flow)
    if (refreshToken) {
      oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      // Refresh the access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Copy the form template
      const copyResponse = await drive.files.copy({
        fileId: templateFileId,
        fields: 'id,name',
      });

      formId = copyResponse.data.id || undefined;
      formName = copyResponse.data.name || undefined;
      result = { id: formId, name: formName };
    } else {
      // Use existing cookie-based flow
      result = await copyDriveFile(templateFileId, eventId);
      formId = result.id || undefined;
      formName = result.name || undefined;
    }
    
    if (!formId) {
      return NextResponse.json({ error: 'Failed to copy file - no ID returned' }, { status: 500 });
    }

    // Step 2: Register a watch for form responses
    let watchId: string | null | undefined;
    try {
      const watchResult = await registerFormWatch(formId, eventId, oauth2Client);
      watchId = watchResult.watchId;
      console.log(`Watch registered for form ${formId}`);
    } catch (watchError) {
      console.error('Error registering form watch:', watchError);
      
      // Clean up: delete the copied file since watch registration failed
      try {
        await deleteDriveFile(formId, eventId, oauth2Client);
        console.log(`Cleaned up: deleted form ${formId} after watch registration failure`);
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
    if (formId && formName) {
      await setFormIdInCookies(eventId, formId, formName);
    }
    
    // Step 4: Fetch current form data to get full object for update to DB
    const formResult = await getFormByEventId(eventId);
    if (formResult.success && formId) {
      try {
        const currentForm = formResult.data;
        
        // Get the actual responder URI from Google Forms API
        let respondersLink = null;
        try {
          const forms = google.forms({ version: 'v1', auth: oauth2Client });
          const formDetails = await forms.forms.get({ formId });
          respondersLink = formDetails.data.responderUri || undefined;
        } catch (formError) {
          console.error('Error fetching responder URI:', formError);
        }
        if (!respondersLink) {
          console.log('No responder URI found for form:', formId);
          respondersLink = null;
        }
        console.log('Responder URI for form', formId, ':', respondersLink);
        
        const updateResult = await updateForm(currentForm.id, {
          event_id: currentForm.event_id,
          form_type: 'google',
          google_form_id: formId,
          google_refresh_token: refreshToken || currentForm.google_refresh_token,
          google_watch_id: watchId || null,
          google_responders_url: respondersLink,
        }, getToken);
        
        if (!updateResult.success) {
          console.error('Failed to update form in backend:', updateResult.error.message);
        }
      } catch (backendError) {
        console.error('Error updating backend:', backendError);
      }
    }
    
    return NextResponse.json({ ...result, success: true });
  } catch (error) {
    console.error('Error copying file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to copy file' },
      { status: 500 }
    );
  }
}

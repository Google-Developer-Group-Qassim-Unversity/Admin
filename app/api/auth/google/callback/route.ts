import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOAuth2Client, setTokensInCookies, copyDriveFile, setFormIdInCookies, registerFormWatch, deleteDriveFile } from '@/lib/google-api';
import { createForm, getFormByEventId, updateForm } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { getToken } = await auth();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // Contains eventId

  if (error) {
    return NextResponse.redirect(new URL('/?error=access_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    await setTokensInCookies(tokens);
    
    // Parse eventId from state
    const eventId = state ? parseInt(state, 10) : null;
    
    if (eventId && tokens.refresh_token) {
      const templateFileId = process.env.TEMPLATE_FROM_FILE_ID;
      
      if (!templateFileId) {
        console.error('TEMPLATE_FROM_FILE_ID not configured');
        return NextResponse.redirect(new URL(`/events/${eventId}?error=config_error`, request.url));
      }
      
      try {
        // Step 1: Check if form already exists for this event
        const existingForm = await getFormByEventId(eventId);
        let formId: number;
        
        if (existingForm.success) {
          formId = existingForm.data.id;
        } else {
          // Create new form with form_type: 'none' as initial state
          const createResult = await createForm({
            event_id: eventId,
            form_type: 'none',
            google_form_id: null,
            google_refresh_token: null,
          }, getToken);
          
          if (!createResult.success) {
            throw new Error('Failed to create form in backend');
          }
          formId = createResult.data.id;
        }
        
        // Step 2: Copy the form template
        const copyResult = await copyDriveFile(templateFileId, eventId);
        
        if (!copyResult.id) {
          throw new Error('Failed to copy file - no ID returned');
        }
        
        // Step 3: Register a watch for form responses
        let watchId: string | null | undefined;
        try {
          const watchResult = await registerFormWatch(copyResult.id, eventId);
          watchId = watchResult.watchId;
          console.log(`Watch registered for form ${copyResult.id}`);
        } catch (watchError) {
          console.error('Error registering form watch:', watchError);
          
          // Clean up: delete the copied file since watch registration failed
          try {
            await deleteDriveFile(copyResult.id, eventId);
            console.log(`Cleaned up: deleted form ${copyResult.id} after watch registration failure`);
          } catch (deleteError) {
            console.error('Error deleting file during cleanup:', deleteError);
          }
          
          throw new Error('Failed to register form watch');
        }
        
        // Step 4: Store form ID in cookies for faster access
        if (copyResult.id && copyResult.name) {
          await setFormIdInCookies(eventId, copyResult.id, copyResult.name);
        }
        
        // Step 5: Update form to success state with google form details
        // Generate the responders link for the Google Form
        const respondersLink = `https://docs.google.com/forms/d/${copyResult.id}/viewform`;
        const updateResult = await updateForm(formId, {
          event_id: eventId,
          form_type: 'google',
          google_form_id: copyResult.id,
          google_refresh_token: tokens.refresh_token,
          google_watch_id: watchId || null,
          google_responders_link: respondersLink,
        }, getToken);
        
        if (!updateResult.success) {
          console.error('Failed to update form in backend:', updateResult.error.message);
        }
      } catch (copyError) {
        console.error('Error during form setup:', copyError);
        return NextResponse.redirect(new URL(`/events/${eventId}?error=form_setup_failed`, request.url));
      }
    }
    
    // Redirect back to the event page if eventId exists
    // Include the refresh token in the redirect so the client can save it to localStorage
    const redirectUrl = eventId 
      ? `/events/${eventId}?auth=success&save_refresh_token=${encodeURIComponent(tokens.refresh_token || '')}`
      : `/?auth=success&save_refresh_token=${encodeURIComponent(tokens.refresh_token || '')}`;
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}

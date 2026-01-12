import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client, setTokensInCookies } from '@/lib/google-api';
import { createForm } from '@/lib/api';

export async function GET(request: NextRequest) {
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
      // POST refresh_token to backend with null google_form_id
      // The form will be copied later when user clicks "Copy Form"
      try {
        const result = await createForm({
          event_id: eventId,
          google_form_id: null,
          refresh_token: tokens.refresh_token,
        });
        
        if (!result.success) {
          console.error('Failed to save form to backend:', result.error.message);
        }
      } catch (backendError) {
        console.error('Error saving to backend:', backendError);
      }
    }
    
    // Redirect back to the event page if eventId exists
    const redirectUrl = eventId 
      ? `/events/${eventId}?auth=success`
      : '/?auth=success';
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}

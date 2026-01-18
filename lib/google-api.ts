import { google, Auth } from 'googleapis';
import { cookies } from 'next/headers';
import { getFormByEventId } from '@/lib/api';

type Credentials = Auth.Credentials;

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_DEV_URL || process.env.GOOGLE_REDIRECT_URL
  );
}

export async function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/forms.responses.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

// Check if tokens are expired or about to expire (within 5 minutes)
export function isTokenExpired(tokens: Credentials | null): boolean {
  if (!tokens || !tokens.expiry_date) {
    return true;
  }
  // Consider expired if less than 5 minutes remaining
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= tokens.expiry_date - bufferMs;
}

export async function getTokensFromCookies(): Promise<Credentials | null> {
  const cookieStore = await cookies();
  const tokensJson = cookieStore.get('google_tokens')?.value;
  
  if (!tokensJson) {
    return null;
  }

  try {
    return JSON.parse(tokensJson) as Credentials;
  } catch {
    return null;
  }
}

export async function setTokensInCookies(tokens: Credentials) {
  const cookieStore = await cookies();
  cookieStore.set('google_tokens', JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearTokensFromCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('google_tokens');
}

// Get refresh token from backend for a specific event
export async function getRefreshTokenFromBackend(eventId: number): Promise<string | null> {
  try {
    const result = await getFormByEventId(eventId);
    if (!result.success) {
      return null;
    }
    return result.data.google_refresh_token || null;
  } catch (error) {
    console.error('Error fetching refresh token from backend:', error);
    return null;
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<Credentials | null> {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

export async function getAuthenticatedClient(eventId?: number) {
  let tokens = await getTokensFromCookies();
  
  // If no tokens in cookies or tokens are expired, try to get from backend
  if ((!tokens || isTokenExpired(tokens)) && eventId) {
    const refreshToken = await getRefreshTokenFromBackend(eventId);
    if (refreshToken) {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens) {
        tokens = newTokens;
        await setTokensInCookies(tokens);
      }
    }
  }
  
  if (!tokens) {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  return oauth2Client;
}

export async function copyDriveFile(fileId: string, eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const response = await drive.files.copy({
    fileId: fileId,
    fields: 'id,name',
  });

  return {
    id: response.data.id,
    name: response.data.name,
  };
}

export async function deleteDriveFile(fileId: string, eventId?: number, providedClient?: Auth.OAuth2Client) {
  const oauth2Client = providedClient || await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  await drive.files.delete({
    fileId: fileId,
  });

  return { success: true };
}

export async function registerFormWatch(formId: string, eventId?: number, providedClient?: Auth.OAuth2Client) {
  const oauth2Client = providedClient || await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const topicName = process.env.GOOGLE_FORMS_TOPIC_NAME;
  
  if (!topicName) {
    throw new Error('GOOGLE_FORMS_TOPIC_NAME not configured');
  }

  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  const response = await forms.forms.watches.create({
    formId: formId,
    requestBody: {
      watch: {
        target: {
          topic: {
            topicName: topicName,
          },
        },
        eventType: 'RESPONSES',
      },
    },
  });

  console.log('Real-time watch setup complete!');
  
  return {
    watchId: response.data.id,
    expireTime: response.data.expireTime,
  };
}

export async function deleteFormWatch(formId: string, watchId: string, eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  await forms.forms.watches.delete({
    formId: formId,
    watchId: watchId,
  });

  console.log('Watch deleted successfully');
  
  return { success: true };
}

export async function listDriveFiles(pageSize: number = 10, eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const response = await drive.files.list({
    pageSize: pageSize,
    fields: 'nextPageToken, files(id, name, mimeType)',
  });

  return response.data.files;
}

export async function getUserInfo(eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    return null;
  }

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const response = await oauth2.userinfo.get();

  return {
    name: response.data.name,
    email: response.data.email,
    picture: response.data.picture,
  };
}

export async function publishForm(formId: string, eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  // Set form to published state to accept responses
  const response = await forms.forms.setPublishSettings({
    // Required. The ID of the form. You can get the id from Form.form_id field.
    formId: formId,
      requestBody: {
        // request body parameters
        publishSettings: {
          publishState: {
            isPublished: true,
            isAcceptingResponses: true,
          }
        },
      },
    });

  return { 
    success: true,
    data: response.data
  };
}

export async function checkFormPublished(formId: string, eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  try {
    const response = await forms.forms.get({ formId });
    // Check if publishedState is 'PUBLISHED'
    return response.data.publishSettings?.publishState?.isPublished;
  } catch (error) {
    console.error('Error checking form published status:', error);
    return false;
  }
}

export async function unpublishForm(formId: string, eventId?: number) {
  const oauth2Client = await getAuthenticatedClient(eventId);
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  // Set form to unpublished state to stop accepting responses
  const response = await forms.forms.setPublishSettings({
    formId: formId,
    requestBody: {
      publishSettings: {
        publishState: {
          isPublished: false,
          isAcceptingResponses: false,
        }
      },
    },
  });

  return { 
    success: true,
    data: response.data
  };
}

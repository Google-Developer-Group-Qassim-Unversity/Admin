import { google } from 'googleapis';
import { cookies } from 'next/headers';

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
  );
}

export async function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function getTokensFromCookies() {
  const cookieStore = await cookies();
  const tokensJson = cookieStore.get('google_tokens')?.value;
  
  if (!tokensJson) {
    return null;
  }

  try {
    return JSON.parse(tokensJson);
  } catch {
    return null;
  }
}

export async function setTokensInCookies(tokens: any) {
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

export async function getAuthenticatedClient() {
  const tokens = await getTokensFromCookies();
  
  if (!tokens) {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  return oauth2Client;
}

export async function copyDriveFile(fileId: string) {
  const oauth2Client = await getAuthenticatedClient();
  
  if (!oauth2Client) {
    throw new Error('Not authenticated');
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const response = await drive.files.copy({
    fileId: fileId,
    requestBody: {
      name: `Copy of Form ${new Date().toISOString()}`,
    },
    fields: 'id,name',
  });

  return {
    id: response.data.id,
    name: response.data.name,
  };
}

export async function listDriveFiles(pageSize: number = 10) {
  const oauth2Client = await getAuthenticatedClient();
  
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

export async function getUserInfo() {
  const oauth2Client = await getAuthenticatedClient();
  
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

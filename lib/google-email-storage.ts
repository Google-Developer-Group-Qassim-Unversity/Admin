/**
 * Remembers the Google account email an admin last typed into the "request
 * access" field, so it autofills next time - purely a UX convenience. Unlike
 * the refresh token this replaces, a typed email address is not a secret.
 */

const GOOGLE_EMAIL_KEY = 'google_form_admin_email';

export function saveGoogleEmail(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GOOGLE_EMAIL_KEY, email);
  } catch (error) {
    console.error('Failed to save Google email to localStorage:', error);
  }
}

export function getSavedGoogleEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(GOOGLE_EMAIL_KEY);
  } catch (error) {
    console.error('Failed to get Google email from localStorage:', error);
    return null;
  }
}

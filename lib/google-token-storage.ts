/**
 * Client-side utilities for managing Google refresh token in localStorage
 * This allows admins to reuse their Google authentication across multiple events
 */

const REFRESH_TOKEN_KEY = 'google_admin_refresh_token';

/**
 * Save the admin's Google refresh token to localStorage
 */
export function saveRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save refresh token to localStorage:', error);
  }
}

/**
 * Get the admin's saved Google refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token from localStorage:', error);
    return null;
  }
}

/**
 * Clear the admin's saved Google refresh token from localStorage
 */
export function clearRefreshToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear refresh token from localStorage:', error);
  }
}

/**
 * Check if the admin has a saved refresh token
 */
export function hasRefreshToken(): boolean {
  return getRefreshToken() !== null;
}

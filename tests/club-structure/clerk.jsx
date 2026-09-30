// Only bundled by the integration runner. Never used by the Next.js application.
// The role picks a test identity; what it can do comes from the backend's
// /access/me, which the test server answers per identity.
const role = new URLSearchParams(location.search).get("role") || "super_admin";
export function useUser() {
  return { isLoaded: true, user: { publicMetadata: {} } };
}
export function useAuth() {
  return { isSignedIn: true, getToken: async () => `browser-${role}` };
}

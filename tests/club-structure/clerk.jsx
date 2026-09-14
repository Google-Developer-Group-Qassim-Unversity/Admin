// Only bundled by the integration runner. Never used by the Next.js application.
const role = new URLSearchParams(location.search).get("role") || "super_admin";
export function useUser() {
  return {
    isLoaded: true,
    user: {
      publicMetadata: {
        is_admin: role === "admin",
        is_super_admin: role === "super_admin",
        is_admin_points: role === "admin_points",
      },
    },
  };
}
export function useAuth() {
  return { getToken: async () => `browser-${role}` };
}

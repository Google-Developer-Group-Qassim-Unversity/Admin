export {};

declare global {
  // Matches the "metadata" claim configured in Clerk Dashboard > Sessions >
  // customize session token: { "metadata": "{{user.public_metadata}}" }.
  // The backend reads identity fields from it (uni_id); nothing reads it for
  // access - that comes from GET /access/me.
  interface CustomJwtSessionClaims {
    metadata?: Record<string, unknown>;
  }
}

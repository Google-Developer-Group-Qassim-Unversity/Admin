export {};

declare global {
  // Matches the "metadata" claim configured in Clerk Dashboard > Sessions >
  // customize session token: { "metadata": "{{user.public_metadata}}" }.
  interface CustomJwtSessionClaims {
    metadata?: {
      is_admin?: boolean;
      is_super_admin?: boolean;
      is_admin_points?: boolean;
    };
  }
}

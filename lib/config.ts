function assertEnv<T extends string>(key: string, value: T | undefined): T {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const config = {
  backendApiUrl: assertEnv('NEXT_PUBLIC_BACKEND_API_URL', process.env.NEXT_PUBLIC_BACKEND_API_URL),
  authFrontendUrl: assertEnv('NEXT_PUBLIC_AUTH_FRONTEND_URL', process.env.NEXT_PUBLIC_AUTH_FRONTEND_URL),
  thisAppUrl: assertEnv('NEXT_PUBLIC_THIS_APP_URL', process.env.NEXT_PUBLIC_THIS_APP_URL),
  memberAppUrl: assertEnv('NEXT_PUBLIC_MEMBER_APP_URL', process.env.NEXT_PUBLIC_MEMBER_APP_URL),
  imageSource: assertEnv('NEXT_PUBLIC_IMAGE_SOURCE', process.env.NEXT_PUBLIC_IMAGE_SOURCE),
  uploadSource: assertEnv('NEXT_PUBLIC_UPLOAD_SOURCE', process.env.NEXT_PUBLIC_UPLOAD_SOURCE),
  clerkPublishableKey: assertEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  sheetProcessorUrl: assertEnv('NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL', process.env.NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL),
} as const

console.log(`API backend url '${config.backendApiUrl}'`)
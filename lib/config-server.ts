import 'server-only'

function assertEnv<T extends string>(key: string, value: T | undefined): T {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const serverConfig = {
  clerkSecretKey: assertEnv('CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY),
  googleClientId: assertEnv('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: assertEnv('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET),
  googleRedirectUrl: assertEnv('GOOGLE_REDIRECT_URL', process.env.GOOGLE_REDIRECT_URL),
  googleFormsTopicName: assertEnv('GOOGLE_FORMS_TOPIC_NAME', process.env.GOOGLE_FORMS_TOPIC_NAME),
  templateFormFileId: assertEnv('TEMPLATE_FORM_FILE_ID', process.env.TEMPLATE_FORM_FILE_ID),
  attendanceJwtSecret: assertEnv('ATTENDANCE_JWT_SECRET', process.env.ATTENDANCE_JWT_SECRET),
  sheetProcessorJwtSecret: assertEnv('SHEET_PROCESSOR_EXPORT_JWT_SECRET', process.env.SHEET_PROCESSOR_EXPORT_JWT_SECRET),
} as const
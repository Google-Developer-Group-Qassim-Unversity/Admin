import 'server-only'

function assertEnv<T extends string>(key: string, value: T | undefined): T {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const serverConfig = {
  clerkSecretKey: assertEnv('CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY),
  attendanceJwtSecret: assertEnv('ATTENDANCE_JWT_SECRET', process.env.ATTENDANCE_JWT_SECRET),
  sheetProcessorJwtSecret: assertEnv('SHEET_PROCESSOR_EXPORT_JWT_SECRET', process.env.SHEET_PROCESSOR_EXPORT_JWT_SECRET),
  // Not a secret - just the Drive file id the Backend also copies from. Kept
  // here only so the Settings page can link a super admin to it; the Backend
  // owns the real copy/share/publish flow (see Backend/docs/GOOGLE_FORMS.md).
  templateFormFileId: assertEnv('TEMPLATE_FORM_FILE_ID', process.env.TEMPLATE_FORM_FILE_ID),
} as const
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
} as const
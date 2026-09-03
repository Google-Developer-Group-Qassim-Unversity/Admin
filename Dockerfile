# syntax=docker/dockerfile:1

# Next.js standalone self-host build (Next 16, pnpm). Requires Node >=20.9.
# Public vars are baked at build via build-args; server-only secrets arrive at runtime via env_file.

ARG NODE_VERSION=20-alpine

ARG PNPM_VERSION=10.23.0

# --- deps ---
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat \
 && npm install -g pnpm@${PNPM_VERSION}
ENV PNPM_HOME=/usr/local/share/pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/usr/local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- builder ---
FROM node:${NODE_VERSION} AS builder
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# Public env (baked into client bundle during next build)
ARG NEXT_PUBLIC_BACKEND_API_URL
ARG NEXT_PUBLIC_AUTH_FRONTEND_URL
ARG NEXT_PUBLIC_THIS_APP_URL
ARG NEXT_PUBLIC_MEMBER_APP_URL
ARG NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_UPLOAD_SOURCE
ENV NEXT_PUBLIC_BACKEND_API_URL=${NEXT_PUBLIC_BACKEND_API_URL} \
    NEXT_PUBLIC_AUTH_FRONTEND_URL=${NEXT_PUBLIC_AUTH_FRONTEND_URL} \
    NEXT_PUBLIC_THIS_APP_URL=${NEXT_PUBLIC_THIS_APP_URL} \
    NEXT_PUBLIC_MEMBER_APP_URL=${NEXT_PUBLIC_MEMBER_APP_URL} \
    NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL=${NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL} \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_UPLOAD_SOURCE=${NEXT_PUBLIC_UPLOAD_SOURCE}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Server-only vars (lib/config-server.ts) are asserted non-empty at module load,
# which Next's build-time page-data collection triggers. The real secrets are
# never used here -> only supplied at container runtime via env_file, so give
# the build harmless placeholders instead of baking real secrets into the image.
ENV CLERK_SECRET_KEY=build-placeholder \
    GOOGLE_CLIENT_ID=build-placeholder \
    GOOGLE_CLIENT_SECRET=build-placeholder \
    GOOGLE_REDIRECT_URL=build-placeholder \
    GOOGLE_FORMS_TOPIC_NAME=build-placeholder \
    TEMPLATE_FORM_FILE_ID=build-placeholder \
    ATTENDANCE_JWT_SECRET=build-placeholder \
    SHEET_PROCESSOR_EXPORT_JWT_SECRET=build-placeholder

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# --- runner ---
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output: copy the pre-built server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]

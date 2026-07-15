# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Archivo production image (Next.js 16 standalone + Prisma 7 + native binaries)
#
# Multi-stage build:
#   1. deps    — install ALL dependencies (incl. dev) needed to build
#   2. builder — generate Prisma client + `next build` (standalone output)
#   3. runner  — minimal runtime image with only what's needed to run
#
# Node 22 is the current LTS and matches .node-version. Debian "bookworm"
# (the default for the -slim tag) is used deliberately over Alpine because
# sharp and the ffmpeg-static/ffprobe-static native binaries are glibc-built
# and misbehave on Alpine's musl libc.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS base
# openssl is required by Prisma's query engine at runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app


# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM base AS deps
# Copy only the manifests first so this layer is cached unless deps change.
COPY package.json package-lock.json* ./
# `npm ci` needs a lockfile. If you don't have one yet, run `npm install`
# locally once to generate package-lock.json and commit it (see DEPLOYMENT.md).
RUN npm ci


# ── Stage 2: build the app ───────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client into src/generated/prisma (gitignored, so it must
# be generated in the image, not copied from the repo).
RUN npx prisma generate

# A DATABASE_URL is not needed to build — Prisma only connects at runtime.
# Disable Next.js telemetry in CI/build environments.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Do NOT hardcode PORT here. Render injects its own PORT env var into the
# running container at runtime, and Next's standalone server.js reads
# process.env.PORT at startup — an ENV set in the image can win over that
# injection depending on the runtime, causing the app to bind the wrong
# port while Render's proxy still tries to route to its assigned one
# (silent 502s with zero app-side logs, since the request never reaches
# the process). Leaving PORT unset here lets Render's real value flow
# through unmodified.

# Run as a non-root user for safety.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# The standalone output bundles a minimal server + only the node_modules it
# traced as needed. Copy it plus the static assets and public folder.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Native-binary packages: Next's standalone tracing does NOT reliably include
# the bundled .exe/binary files for ffmpeg-static/ffprobe-static (they resolve
# their path via __dirname at runtime — this is the same reason they're in
# serverExternalPackages). Copy them explicitly so video thumbnail/duration
# extraction works in production. sharp is glibc-native too but Next traces it
# correctly; copying it as well is cheap insurance.
COPY --from=builder /app/node_modules/ffmpeg-static ./node_modules/ffmpeg-static
COPY --from=builder /app/node_modules/ffprobe-static ./node_modules/ffprobe-static

# Prisma needs its generated client + schema/engine at runtime.
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma

# ── CLI tooling for migrations & seeding ─────────────────────────────────────
# Render's preDeployCommand runs `npx prisma migrate deploy` inside THIS image,
# and first-time seeding runs `npm run db:seed` (tsx) via the Render Shell.
# The Next.js standalone bundle only traces runtime app deps, so the Prisma
# CLI, tsx, dotenv, and the config/manifest aren't included by default. Copy
# what those commands need so they resolve without a full `npm install` at
# deploy time. package.json is needed for the "db:seed" script + the prisma
# seed hook; prisma.config.ts supplies DATABASE_URL to the CLI.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# The app writes uploaded files and avatars to ./storage at runtime. Create the
# folders and hand ownership to the runtime user. On Render these paths are
# where you mount a PERSISTENT DISK (see render.yaml) so files survive deploys.
RUN mkdir -p ./storage/uploads ./storage/avatars ./backups \
    && chown -R nextjs:nodejs ./storage ./backups

USER nextjs
EXPOSE 3000

# server.js is emitted by Next's standalone build at the repo root of the copy.
CMD ["node", "server.js"]

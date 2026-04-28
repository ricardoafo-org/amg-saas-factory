# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:24-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_COMMIT_SHA
ENV NEXT_PUBLIC_COMMIT_SHA=${NEXT_PUBLIC_COMMIT_SHA}

# TENANT_ID is required at build time — the app reads tenant config during
# next build (loadClientConfig is called from layout.tsx and page.tsx).
# Default keeps the build green when not passed; override per-tenant in
# multi-tenant builds. Mirrors the runtime env var read by getTenantId().
ARG TENANT_ID=talleres-amg
ENV TENANT_ID=${TENANT_ID}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build:docker

# Stage 3: Production runner (minimal image)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy only the standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Stage 4: Ops image — apply-schema, seed-tenant, integration tests.
# Built and pushed alongside the prod image as a separate tag (e.g. :tst-ops).
# Invoked one-shot from the deploy workflow:
#   docker run --rm --network amg_default --env-file /srv/amg/.env.tst \
#     ghcr.io/<org>/amg-saas-factory:<tag>-ops tsx scripts/apply-schema.ts
# Carries devDeps (tsx, vitest) so the same immutable artifact runs ops
# scripts AND integration tests across dev / CI / VPS.
FROM node:24-alpine AS ops
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 ops

COPY --from=deps --chown=ops:nodejs /app/node_modules ./node_modules
COPY --chown=ops:nodejs . .

USER ops

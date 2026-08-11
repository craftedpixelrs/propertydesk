# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# PropertyDesk production image
#
# Multi-stage build for Next.js 16 standalone output. Final image contains
# only Node runtime, the standalone bundle, static assets, Prisma generated
# client + migrations, and the tsx-based seed script. No dev deps, no
# pnpm store, no source that isn't shipped.
# ---------------------------------------------------------------------------

# ============================================================================
# 1) deps — install ALL dependencies (dev + prod) with pnpm, cached
# ============================================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Pin every pnpm state to inside /app so `COPY --from=deps /app/node_modules`
# in the next stage still points at a valid store. If the store lives
# outside `/app`, pnpm records that absolute path and the builder stage
# can't find it (ERR_PNPM_UNEXPECTED_STORE / broken symlinks).
ENV PNPM_HOME=/app/.pnpm-bin \
    PNPM_STORE_DIR=/app/.pnpm-store \
    PATH=/app/.pnpm-bin:$PATH \
    CI=1

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# libc6-compat helps some prebuilt binaries (e.g. @next/swc) on alpine
RUN apk add --no-cache libc6-compat openssl

COPY package.json pnpm-lock.yaml* .npmrc ./
COPY prisma ./prisma

# `node-linker=hoisted` = flat `node_modules` (npm-style), which Next's
# TypeScript detection needs (`require.resolve('typescript')`).
RUN pnpm config set node-linker hoisted && \
    pnpm config set store-dir /app/.pnpm-store && \
    pnpm install --frozen-lockfile=false --prefer-frozen-lockfile

# ============================================================================
# 2) builder — compile the Next standalone bundle
# ============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/app/.pnpm-bin \
    PNPM_STORE_DIR=/app/.pnpm-store \
    PATH=/app/.pnpm-bin:$PATH \
    CI=1
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.pnpm-store ./.pnpm-store
COPY . .

# Re-anchor pnpm config inside this stage so it recognises the store
# location that was baked in by the deps stage.
RUN pnpm config set node-linker hoisted && \
    pnpm config set store-dir /app/.pnpm-store

# NEXT_PUBLIC_* are inlined into the client bundle at build time — pass
# them via `--build-arg` from docker-compose so the built image contains
# the correct URLs and Loops form id. Every one has a safe default.
ARG NEXT_PUBLIC_APP_URL=https://my.propertydesk.app
ARG NEXT_PUBLIC_APP_NAME=PropertyDesk
ARG NEXT_PUBLIC_APP_DOMAIN=propertydesk.app
ARG NEXT_PUBLIC_APP_LOCALE=sr-Latn
ARG NEXT_PUBLIC_APP_TIMEZONE=Europe/Belgrade
ARG NEXT_PUBLIC_MY_APP_URL=https://my.propertydesk.app
ARG NEXT_PUBLIC_LOOPS_FORM_ID=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL=
ARG NEXT_PUBLIC_PRODUCT_VIDEO_URL=

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_APP_DOMAIN=$NEXT_PUBLIC_APP_DOMAIN \
    NEXT_PUBLIC_APP_LOCALE=$NEXT_PUBLIC_APP_LOCALE \
    NEXT_PUBLIC_APP_TIMEZONE=$NEXT_PUBLIC_APP_TIMEZONE \
    NEXT_PUBLIC_MY_APP_URL=$NEXT_PUBLIC_MY_APP_URL \
    NEXT_PUBLIC_LOOPS_FORM_ID=$NEXT_PUBLIC_LOOPS_FORM_ID \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL=$NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL \
    NEXT_PUBLIC_PRODUCT_VIDEO_URL=$NEXT_PUBLIC_PRODUCT_VIDEO_URL

# `prisma generate` reads the config but never connects — a placeholder
# URL is enough. `prisma.config.ts` uses `env("DIRECT_URL")` which throws
# on missing values, so we inject a dummy for this stage only.
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-must-be-32-plus-chars-long \
    BETTER_AUTH_URL=http://localhost:3000
RUN pnpm exec prisma generate

# Prisma 7's CLI does `require("@prisma/config")` at runtime, which in
# turn pulls in `effect`, `c12`, `deepmerge-ts`, `empathic`, ... and all
# of their transitive deps. With pnpm's isolated layout these normally
# live under `node_modules/.pnpm/…/node_modules/` and are only resolvable
# via the NODE_PATH-augmented `.bin/prisma` shim. The runner stage runs
# `node_modules/.bin/prisma migrate deploy` directly (no pnpm shim), so
# we install a self-contained npm-style flat `node_modules/` tree at
# `/prisma-cli/node_modules/` using plain `npm install`, then the runner
# COPYs it on top of its own node_modules. This is much more robust than
# trying to walk pnpm's symlink graph — npm resolves the transitive
# closure for us and lays it out flat.
COPY <<'SH' /tmp/install-prisma-cli.sh
#!/bin/sh
set -eu

mkdir -p /prisma-cli
cd /prisma-cli

PRISMA_VERSION=$(node -e '
  const pj = require("/app/package.json");
  const v = (pj.dependencies && pj.dependencies.prisma)
    || (pj.devDependencies && pj.devDependencies.prisma);
  if (!v) { console.error("no prisma dep in /app/package.json"); process.exit(1); }
  console.log(v);
')
CONFIG_VERSION=$(node -e '
  const pj = require("/app/package.json");
  const v = (pj.dependencies && pj.dependencies["@prisma/config"])
    || (pj.devDependencies && pj.devDependencies["@prisma/config"])
    || "*";
  console.log(v);
')

echo "  prisma: $PRISMA_VERSION"
echo "  @prisma/config: $CONFIG_VERSION"

echo '{"name":"prisma-cli-runtime","private":true,"version":"1.0.0"}' > package.json
npm install --no-audit --no-fund --no-package-lock \
  "prisma@${PRISMA_VERSION}" \
  "@prisma/config@${CONFIG_VERSION}" \
  dotenv \
  tsx

node -e "
  process.chdir('/tmp');
  process.env.NODE_PATH = '/prisma-cli/node_modules';
  require('module').Module._initPaths();
  require('@prisma/config');
  console.log('  ✓ @prisma/config resolves flat from /prisma-cli/node_modules');
"
SH

RUN sh /tmp/install-prisma-cli.sh && rm -f /tmp/install-prisma-cli.sh

# The project uses TypeScript 7 (native compiler) for `pnpm typecheck`,
# but Next 16 still expects the JavaScript TS 5.x API when it runs its
# internal type-collection pass (server actions typing, route params).
# Overwrite node_modules/typescript with TS 5.x. `pnpm add` re-resolves
# the whole graph (OOMs on this host), so we drop straight into the
# folder with plain npm install + no lockfile/audit.
RUN npm install --prefix /tmp/tsc typescript@5.7.2 --no-save --no-audit --no-fund --no-package-lock && \
    rm -rf node_modules/typescript && \
    cp -a /tmp/tsc/node_modules/typescript node_modules/typescript && \
    rm -rf /tmp/tsc && \
    node -e "console.log('ts:', require('typescript').version)"

# Turbopack (Next 16 default builder) crashes with
# `Option::unwrap() on a None value` inside `turbo-tasks/manager.rs` on
# this project — reproducible even with 6 GiB of swap. Webpack is the
# documented opt-out and produces the same standalone output.
#
# Node V8 default old-space is ~512 MiB. Raise to 4 GiB so webpack can
# hold the module graph in memory; swap picks up any spillover on the
# 1 GiB-RAM host.
ENV NODE_OPTIONS=--max-old-space-size=4096 \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec next build --webpack

# ============================================================================
# 3) runner — minimal production image
# ============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat openssl tini \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Standalone Next output: server bundle, static assets, public dir.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Ship Prisma migrations + schema + seed so we can run `migrate deploy`
# and `db:seed` from inside the container without a full source checkout.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Prisma 7 reads the datasource URL from prisma.config.ts, so the CLI is
# unusable without it ("datasource.url property is required"). The config
# also does `import "dotenv/config"`, hence the dotenv copy.
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
# Runtime `@prisma/client` for the app (the actual `PrismaClient` import)
# and its generated output at `.prisma/client`. These come from the pnpm
# tree because that's where `prisma generate` wrote them.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# /prisma-cli/node_modules is a self-contained flat tree materialised by
# `npm install prisma @prisma/config dotenv tsx` in the builder stage
# (independent of pnpm's isolated symlink graph). Contains `prisma`,
# `@prisma/config`, `effect`, `c12`, `deepmerge-ts`, `empathic`,
# `dotenv`, `tsx` and every transitive dep — laid out flat so
# `node_modules/.bin/prisma migrate deploy` and
# `node_modules/.bin/tsx prisma/seed.ts` work out of the box. This COPY
# comes AFTER the pnpm @prisma COPY so npm's flat `@prisma/config` +
# `effect` overlay wins where they intersect, while `@prisma/client`
# (which npm doesn't ship) stays intact.
COPY --from=builder --chown=nextjs:nodejs /prisma-cli/node_modules/ ./node_modules/

# Local storage directory for uploaded PDFs / images when
# STORAGE_PROVIDER=local. Docker volume is mounted here at runtime.
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage
VOLUME ["/app/storage"]

USER nextjs
EXPOSE 3000

# tini as PID 1 → clean shutdown on SIGTERM; standalone server is a plain
# node script.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

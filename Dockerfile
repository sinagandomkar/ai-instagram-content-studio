# AI Instagram Content Studio — Docker image (Postgres-backed; see docs/DEPLOYMENT.md)
# Multi-stage build → small runtime image using Next.js `output: "standalone"`.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Note: prisma/schema.prisma and the generated client aren't needed here — the
# standalone server bundle already has the generated client compiled in, and
# migrations run against the `builder`-stage `migrate` service, not this image.

EXPOSE 3000
# Migrations are NOT run here on purpose: `prisma` (the CLI) is a devDependency and
# isn't part of Next's standalone trace, so it isn't in this image. Run
# `docker compose run --rm migrate` once before first start, and again after pulling
# a version with new migrations — see docs/DEPLOYMENT.md.
CMD ["node", "server.js"]

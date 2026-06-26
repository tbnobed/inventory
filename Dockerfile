# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Fleet Inventory Dashboard — production image (API + built React SPA in one
# container). Fully self-contained: no Replit services required at runtime.
# ---------------------------------------------------------------------------

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Pin pnpm to match the lockfile (lockfileVersion 9.0).
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# Build stage: install all workspace deps and produce the API bundle +
# frontend static build.
# ---------------------------------------------------------------------------
FROM base AS build
# NOTE: do NOT set NODE_ENV=production here — it would prune devDependencies
# (vite, esbuild, tsc) that the build needs. NODE_ENV=production is applied
# inline on each build command instead, and on the runtime stage.

# Copy the whole monorepo (node_modules is excluded via .dockerignore) and
# install with the frozen lockfile for reproducible builds. Include dev deps.
COPY . .
RUN pnpm install --frozen-lockfile --prod=false

# Build composite shared libs first (documented gotcha), then the apps.
RUN pnpm run typecheck:libs

# Frontend: Vite needs PORT + BASE_PATH at build time. BASE_PATH=/ serves the
# dashboard at the domain root (single-origin deploy behind the reverse proxy).
# VITE_ORG_NAME is baked into the bundle here; change it in .env and rebuild.
ARG VITE_ORG_NAME="OBTV Edit Systems"
ARG VITE_VNC_URL_TEMPLATE="vnc://{ip}"
ARG VITE_JUMP_URL_TEMPLATE="jump://?host={hostname}&protocol=fluid"
RUN PORT=19295 BASE_PATH=/ NODE_ENV=production VITE_ORG_NAME="$VITE_ORG_NAME" \
    VITE_VNC_URL_TEMPLATE="$VITE_VNC_URL_TEMPLATE" \
    VITE_JUMP_URL_TEMPLATE="$VITE_JUMP_URL_TEMPLATE" \
    pnpm --filter @workspace/fleet-dashboard run build

# API: esbuild bundles a self-contained ESM file at dist/index.mjs.
RUN NODE_ENV=production pnpm --filter @workspace/api-server run build

# ---------------------------------------------------------------------------
# Runtime stage: only the API bundle + the frontend static files. The esbuild
# bundle is self-contained, so no node_modules are shipped.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# API server bundle (and its sourcemaps / pino transport chunks).
COPY --from=build /app/artifacts/api-server/dist ./dist

# Built React SPA, served by the API server via PUBLIC_DIR.
COPY --from=build /app/artifacts/fleet-dashboard/dist/public ./public
ENV PUBLIC_DIR=/app/public

# The API server listens on PORT (set in docker-compose). Default for clarity.
ENV PORT=8080
EXPOSE 8080

# Run as the unprivileged node user that ships with the base image.
USER node

CMD ["node", "--enable-source-maps", "dist/index.mjs"]

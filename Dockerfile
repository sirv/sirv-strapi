# Builds and runs the example Strapi app (examples/strapi) with @sirv/strapi-plugin.
# Deploy on any Node host (Render, Railway, Fly.io, a VM, etc.). Build context = repo root.
FROM node:20-bookworm AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1337 \
    NODE_OPTIONS=--max-old-space-size=4096

# Build tools for native modules (better-sqlite3, sharp).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# Install workspace deps (cache-friendly: manifests first).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/strapi-plugin/package.json apps/strapi-plugin/
COPY packages/core/package.json packages/core/
COPY packages/sirv-client/package.json packages/sirv-client/
COPY packages/url-builder/package.json packages/url-builder/
COPY examples/strapi/package.json examples/strapi/
RUN pnpm install --frozen-lockfile

# Copy the rest and build: plugin dist, then the Strapi admin.
COPY . .
RUN pnpm --filter @sirv/strapi-plugin build
RUN pnpm --filter sirv-strapi-example exec strapi build

WORKDIR /app/examples/strapi
EXPOSE 1337
# Persist SQLite across restarts by mounting a volume at this path (see docs/DEPLOY.md).
VOLUME ["/app/examples/strapi/.tmp"]
CMD ["pnpm", "exec", "strapi", "start"]

FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm -C apps/worker install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/worker apps/worker
WORKDIR /app/apps/worker
CMD ["node","src/index.ts"]

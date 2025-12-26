FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm -C apps/api install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node","src/index.ts"]

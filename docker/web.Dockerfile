FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps apps
COPY packages packages
RUN corepack enable && pnpm install --no-frozen-lockfile
RUN pnpm -C apps/web build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app /app
EXPOSE 3000
CMD ["pnpm","-C","apps/web","start"]

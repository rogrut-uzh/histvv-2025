# STAGE 1 — Build
FROM node:20-alpine AS build
WORKDIR /app
ENV LANG=C.UTF-8
COPY package*.json ./
RUN npm ci
COPY . .
ARG SITE_URL
ENV SITE_URL=$SITE_URL
RUN npm run build

# STAGE 2 — Runtime (non-root)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

USER node
EXPOSE 3001
CMD ["node","./dist/server/entry.mjs"]

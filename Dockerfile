# STAGE 1 — Build
FROM node:20-alpine AS build
ARG SITE_URL
ENV SITE_URL=$SITE_URL
WORKDIR /app
ENV LANG=C.UTF-8
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# STAGE 2 — Runtime (non-root)
FROM node:20-alpine
ENV HOST=0.0.0.0
ENV PORT=3001
WORKDIR /app
ENV NODE_ENV=development
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
USER node
EXPOSE 3001
CMD ["node","./dist/server/entry.mjs"]

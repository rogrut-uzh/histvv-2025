# STAGE 1 — Build
FROM node:20-alpine AS build
WORKDIR /app
ENV LANG=en_US.UTF-8
COPY package*.json ./
RUN npm ci
COPY . .
ARG SITE_URL
ENV SITE_URL=$SITE_URL
RUN npm run build   # erzeugt dist/server/entry.mjs dank Node-Adapter

# STAGE 2 — Runtime (Node server)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80

# Tools, die wir im Entrypoint verwenden (curl für einen schnellen HEAD-Check)
RUN apk add --no-cache curl

# App + Skripte übernehmen
COPY --from=build /app/dist     ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

# Entrypoint-Skript
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
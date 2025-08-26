# STAGE 1 — Build
FROM node:20-alpine AS build
WORKDIR /app
ENV LANG=en_US.UTF-8
COPY package*.json ./
RUN npm ci
COPY . .
# ❌ Nicht mehr in public kopieren – Daten sollen nicht öffentlich sein
# RUN mkdir -p public/data && cp data/*.json public/data/

ARG SITE_URL
ENV SITE_URL=$SITE_URL
RUN npm run build   # erzeugt dist/server/entry.mjs dank Node-Adapter

# STAGE 2 — Runtime (Node server)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80
# Optional: ELASTICSEARCH_URL hier setzen oder via Compose
# ENV ELASTICSEARCH_URL=http://elasticsearch:9200

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

EXPOSE 80
CMD ["node", "./dist/server/entry.mjs"]

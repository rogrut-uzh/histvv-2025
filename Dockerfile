###################
# STAGE 1 — Build #
###################
FROM node:20-alpine AS build_stage
# Startet mit Node.js 20 auf Alpine Linux (klein & schnell)
# AS build_stage = Name für diese Stage (wird in Stage 2 referenziert), frei wählbar

ARG SITE_URL
# Build-Zeit-Variable (kommt von docker-compose args)

ENV SITE_URL=$SITE_URL
# Macht ARG als Umgebungsvariable ENV verfügbar. Astro braucht SITE_URL beim Build für absolute URLs
# Dies ist optional aber best practice. Man könnte den weiter unten stehenden RUN Befehl auch so schreiben:
# RUN SITE_URL=$SITE_URL npm run build
# anstatt
# RUN npm run build

WORKDIR /app
# - Erstellt Verzeichnis /app und wechselt gleich da rein. Wenn man das nicht so machen würde:
#   - Unordentlich: Deine Dateien liegen direkt in /
#   - Gefährlich: Könnte System-Dateien überschreiben
#   - Unprofessionell: Vermischt App mit System
#   - Schwer zu debuggen: Wo sind meine Dateien? Überall!

ENV LANG=C.UTF-8
# UTF-8 Encoding setzen (wichtig für deutsche Umlaute)

COPY package*.json ./
# Kopiert nur package.json und package-lock.json, und zwar in /app!

RUN npm ci
# Clean Install (schneller & deterministischer als npm install)

COPY . .
# Kopiert gesamten Projektcode

RUN npm run build
# führt astro build aus. Hier entsteht dist/-Ordner mit:
#   dist/server/entry.mjs; der kompilierte Serverd
#   dist/client/; statische Assets (CSS, JS, Bilder)


################################
# STAGE 2 — Runtime (non-root) #
################################
FROM node:20-alpine AS runtime_stage
# Frisches Image! Ohne Build-Tools, nur Node.js Runtime

ENV HOST=0.0.0.0
ENV PORT=3001
# Server-Konfiguration. 
# - Lauscht auf allen Netzwerkinterfaces (wichtig für Docker)
# - Nutzt Port 3001

WORKDIR /app
# Erstellt Verzeichnis /app und wechselt gleich da rein. 

ENV NODE_ENV=production
# Standard für Production. Wird überschrieben mit development aus docker-compose, für lokale Entwicklung -> mehr Debug Informationen

COPY --from=build_stage /app/dist ./dist
COPY --from=build_stage /app/package*.json ./
# - --from=build_stage = Holt Dateien aus Stage 1
# - Kopiert nur das kompilierte Ergebnis (dist/)
# - Kopiert package.json für Production Dependencies
# - kopiert in /app rein!

RUN npm ci --omit=dev --no-audit --no-fund
# Installiert nur Production Dependencies
# --omit=dev = keine DevDependencies (TypeScript, Astro CLI, etc.)
# Spart ~70% der node_modules Grösse!

USER node
# Sicherheit: Wechselt von root zu User node
# Verhindert, dass der Container mit Root-Rechten läuft

EXPOSE 3001
# nur zu Dokumentationszwecken

CMD ["node","./dist/server/entry.mjs"]
# Startet den kompilierten Astro-Server direkt mit Node.js
# Woher kommt entry.mjs?
# Astro generiert es beim Build:
# 
# Du schreibst Code in src/pages/*.astro
# astro build (mit output: 'server') kompiliert alles
# Ergebnis: dist/server/entry.mjs = Standalone Node.js Server
# 
# Was macht entry.mjs?
# 
# HTTP-Server (basierend auf @astrojs/node)
# Rendert deine Astro-Seiten bei jeder Anfrage
# Verbindet sich zu Elasticsearch
# Liefert statische Assets aus




# ┌─────────────────────────────────────────┐
# │  docker compose build --no-cache        │
# └──────────────────┬──────────────────────┘
#                    │
#                    ▼
#          ┌──────────────────┐
#          │   STAGE 1: Build │
#          │                  │
#          │ 1. npm ci (alle) │
#          │ 2. astro build   │
#          │ → erstellt dist/ │
#          └────────┬─────────┘
#                   │
#                   │ COPY --from=build
#                   ▼
#          ┌──────────────────┐
#          │  STAGE 2: Runtime│
#          │                  │
#          │ 1. Kopiert dist/ │
#          │ 2. npm ci --prod │
#          │ 3. USER node     │
#          └────────┬─────────┘
#                   │
#                   │ Ergebnis: Docker Image
#                   ▼
# ┌─────────────────────────────────────────┐
# │  docker compose up -d                   │
# └──────────────────┬──────────────────────┘
#                    │
#                    ▼
#          ┌────────────────────┐
#          │  Container Start   │
#          │                    │
#          │ CMD node entry.mjs │
#          │ → Server läuft     │
#          └────────────────────┘
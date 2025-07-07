# STAGE 1 — Build stage
FROM node:20-alpine AS builder

ENV LANG=en_US.UTF-8
#ENV HTTPS_PROXY=http://zoneproxy.zi.uzh.ch:8080
#ENV HTTP_PROXY=http://zoneproxy.zi.uzh.ch:8080
#ENV NO_PROXY=localhost,127.0.0.1

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./

#RUN npm config set https-proxy http://zoneproxy.zi.uzh.ch:8080
#RUN npm config set proxy http://zoneproxy.zi.uzh.ch:8080
#RUN npm config set strict-ssl false
RUN npm install

# Copy all project files
COPY . .
RUN mkdir -p public/data && cp data/*.json public/data/
# Bedingt löschen, je nach ARG
ARG EXCLUDE_DOZIERENDE=false
RUN if [ "$EXCLUDE_DOZIERENDE" = "true" ]; then rm -rf src/pages/dozierende; fi

# Build static site
ARG SITE_URL
ENV SITE_URL=$SITE_URL

RUN npm run build

# STAGE 2 — Production image
FROM nginx:alpine

# Copy built site from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

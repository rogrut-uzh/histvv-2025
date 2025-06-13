# STAGE 1 — Build stage
FROM node:20-alpine AS builder

ENV LANG=en_US.UTF-8

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all project files
COPY . .

# Build static site
RUN npm run build

# STAGE 2 — Production image
FROM nginx:alpine

# Copy built site from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

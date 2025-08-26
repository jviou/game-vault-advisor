Game Vault Advisor

Video game collection manager (React + Vite + TypeScript + shadcn/ui).
Features saga grouping, search & filters, saga pages with reordering, JSON import/export, and a responsive JEUX banner served from /public.

Table of Contents

Requirements

Configuration

Run locally (without Docker)

Deploy with Docker (recommended)

Dockerfile

Nginx SPA fallback

Build & run

docker-compose.yml

CI/CD (optional) — GitHub Actions → Docker image

Useful file structure

Common issues / FAQ

License

Requirements

Node.js ≥ 18 (if running locally without Docker)

Docker or Docker Desktop (for container deployment)

Configuration

The app uses an API (functions in src/lib/api).
You can configure the API base URL with a Vite env variable:

Create a .env (or .env.production) file at the root:

VITE_API_BASE_URL=https://your-api.example.com


⚠️ Vite environment variables must start with VITE_.
If none is set, the default inside src/lib/api will be used.

If deploying under a subfolder (e.g. https://example.com/game-vault/), set base: '/game-vault/' in vite.config.ts.
Otherwise, keep the default ('/').

Run locally (without Docker)
# 1) Install dependencies
pnpm i        # or npm i / yarn install

# 2) Start dev server
pnpm dev      # or npm run dev

# 3) Build + preview (optional)
pnpm build && pnpm preview

Deploy with Docker (recommended)
Dockerfile

Add this Dockerfile at the project root:

# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml* yarn.lock* .npmrc* ./
RUN npm ci || yarn install --frozen-lockfile || pnpm i --frozen-lockfile

COPY . .

# Optional: inject env var at build time
# ARG VITE_API_BASE_URL
# ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production
RUN npm run build || yarn build || pnpm build

# ---------- Runner ----------
FROM nginx:alpine

# Nginx config for SPA
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

Nginx SPA fallback

Create nginx.conf at the root (ensures React routes work):

server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Static assets (long cache)
  location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
    access_log off;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # React SPA fallback
  location / {
    try_files $uri /index.html;
  }
}

Build & run
# 1) (optional) set env var for API
# export VITE_API_BASE_URL=https://your-api.example.com

# 2) Build Docker image
docker build -t game-vault:latest .

# 3) Run container
docker run -d --name game-vault -p 8080:80 game-vault:latest

# → open http://localhost:8080


💡 You can also pass the var at build-time:

docker build --build-arg VITE_API_BASE_URL=https://your-api.example.com -t game-vault:latest .

docker-compose.yml

One-command run:

version: "3.9"
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: "https://your-api.example.com"
    image: game-vault:latest
    container_name: game-vault
    ports:
      - "8080:80"
    restart: unless-stopped


Run with:

docker compose up -d --build

CI/CD (optional) — GitHub Actions → Docker image

Add .github/workflows/docker.yml:

name: Build & Push Docker image
on:
  push:
    branches: [ main ]

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          build-args: |
            VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}


Then pull the image on your server:

docker pull ghcr.io/<user>/<repo>:latest
docker run -d -p 8080:80 ghcr.io/<user>/<repo>:latest

Useful file structure
public/
  banner_jeux_1024x360.jpg
  banner_jeux_1600x450.jpg
  banner_jeux_1920x500.jpg
  favicon.ico
src/
  pages/Index.tsx            # "JEUX" banner + saga list
  pages/SagaPage.tsx         # Saga page + reordering
  components/GameForm.tsx    # Game form
  lib/api.ts                 # API calls (uses VITE_API_BASE_URL)
  lib/slug.ts                # slugify / normalizeSaga


Banners are served directly from /public.

Common issues / FAQ

Blank page / 404 in production
→ Ensure nginx.conf includes try_files $uri /index.html;

API unreachable / CORS
→ Double check VITE_API_BASE_URL in production. Enable CORS on your API if needed.

Deploying under subfolder (e.g. /apps/games/)
→ Set base: '/apps/games/' in vite.config.ts + configure reverse proxy.

Cache too aggressive
→ Assets are built with unique hashes. Rebuild image to invalidate cache.

License

MIT — enjoy 🎮

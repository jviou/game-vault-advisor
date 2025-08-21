# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_SGDB_KEY
ENV VITE_SGDB_KEY=${VITE_SGDB_KEY}
COPY package*.json ./
RUN npm ci
COPY . .
# si tu héberges sous un sous-dossier, ajoute: VITE_BASE=/app/
RUN npm run build

# ---- run (nginx) ----
FROM nginx:alpine
# fichier de conf SPA avec fallback vers index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

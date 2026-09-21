# Multi-stage build: Vite build -> nginx static hosting

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time API base URL (used by axiosInstance.js)
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build-time assets base URL (used to compose <img src> for profile pics, etc.).
# Default to empty so the resulting URL is same-origin (e.g. "/uploads/x.jpg"),
# proxied to the backend by nginx — no separate asset host needed in production.
# Override per-environment if assets are served from a CDN.
ARG VITE_ASSETS_BASE_URL=""
ENV VITE_ASSETS_BASE_URL=${VITE_ASSETS_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine AS final

# Nginx will substitute API_UPSTREAM into the template at container start
ENV API_UPSTREAM=api:8080

COPY nginx.template.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# envsubst is built into nginx image via /docker-entrypoint.d logic when templates are present
CMD ["nginx", "-g", "daemon off;"]

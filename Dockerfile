# Build stage
FROM node:lts-bookworm AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM nginx:bookworm

# Patched Debian packages for Wiz cicd-policy-vuln-critical (Studioshare CI):
# libssl3/openssl >= 3.0.19-1~deb12u2 (CVE-2026-31789),
# libgnutls30 >= 3.7.9-2+deb12u7 (CVE-2026-42010, CVE-2026-33845).
RUN apt-get update \
  && apt-get install -y --no-install-recommends --only-upgrade \
       libssl3 openssl libgnutls30 \
  && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
RUN useradd -U -u 1000 appuser && chown -R 1000:1000 /usr/share/nginx/html
USER 1000
CMD ["nginx", "-g", "daemon off;"]

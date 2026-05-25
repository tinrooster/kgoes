# Build stage
FROM node:lts-bookworm AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM nginx:bookworm
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
RUN useradd -U -u 1000 appuser && chown -R 1000:1000 /usr/share/nginx/html
USER 1000
CMD ["nginx", "-g", "daemon off;"]

# Build stage
FROM node:lts-bookworm AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage — Alpine nginx stack matches trackIT Studioshare runtime.
FROM alpine:3.22 AS runtime

RUN apk update \
  && apk add --no-cache nginx \
  && apk add --no-cache --upgrade libcrypto3 libssl3 libxml2 \
  && rm -rf /var/cache/apk/* \
  && mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi \
       /tmp/nginx/uwsgi /tmp/nginx/scgi /run/nginx /usr/share/nginx/html \
  && chown -R nginx:nginx /tmp/nginx /run/nginx /usr/share/nginx/html \
  && chmod -R g+rwX /tmp/nginx /run/nginx /usr/share/nginx/html

COPY docker/nginx.main.conf /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

USER nginx

CMD ["nginx", "-g", "daemon off;"]

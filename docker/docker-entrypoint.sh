#!/bin/sh
set -e

# Studioshare sidecar health checks use http://localhost:8080/ which Go resolves to [::1]:8080.
# Nginx binds IPv4 only in this image; bridge ::1 → 127.0.0.1 without conflicting on 0.0.0.0:8080.
if command -v socat >/dev/null 2>&1; then
  socat TCP6-LISTEN:8080,bind=[::1],reuseaddr,fork TCP:127.0.0.1:8080 &
fi

exec nginx -g 'daemon off;'

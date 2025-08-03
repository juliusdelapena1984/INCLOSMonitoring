#!/bin/sh
set -e


# Substitute into real config
envsubst '${EXPRESS_SERVER_HOST_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Optionally dump the final config for debugging
echo "=== Final nginx.conf ==="
cat /etc/nginx/nginx.conf
echo "======================="

# Start nginx in foreground
exec nginx -g 'daemon off;'

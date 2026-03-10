#!/bin/sh
set -eu

RESOLVER_DEFAULT="$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf || true)"
export RESOLVER="${RESOLVER:-$RESOLVER_DEFAULT}"

envsubst '$RESOLVER $CORE_HOST' \
  < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

nginx -t
exec nginx -g 'daemon off;'
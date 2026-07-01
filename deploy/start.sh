#!/bin/sh
set -e
mkdir -p /app/data
export BIND_HOST=127.0.0.1
cd /app/server
node dist/index.js &
exec nginx -g 'daemon off;'

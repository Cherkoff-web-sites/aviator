#!/bin/sh
set -e
mkdir -p /app/data /app/data/uploads
export BIND_HOST=127.0.0.1
export UPLOAD_DIR="${UPLOAD_DIR:-/app/data/uploads}"
cd /app/server
node dist/index.js &
exec nginx -g 'daemon off;'

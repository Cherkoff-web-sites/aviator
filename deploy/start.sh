#!/bin/sh
set -e
mkdir -p /app/data
cd /app/server
node dist/index.js &
exec nginx -g 'daemon off;'

#!/bin/bash
set -e
echo "Starting Frontend with Wrangler..."

# Run with wrangler
cd /app/dist/server && npx wrangler dev --host 0.0.0.0 --port 3000 &
apachectl -D FOREGROUND
#!/bin/bash
set -e
echo "Starting Frontend with Wrangler..."

# Run with wrangler using generated config when available.
# Fallback to explicit script/assets so container startup does not depend on wrangler.json generation.
cd /app/dist/server
if [ -f ./wrangler.json ]; then
	npx wrangler dev --config ./wrangler.json --host 0.0.0.0 --port 3000 &
elif [ -f ./index.js ]; then
	npx wrangler dev ./index.js --assets=../client --compatibility-date=2025-09-24 --host 0.0.0.0 --port 3000 &
elif [ -f ./server.js ]; then
	npx wrangler dev ./server.js --assets=../client --compatibility-date=2025-09-24 --host 0.0.0.0 --port 3000 &
else
	echo "No worker entry found in /app/dist/server (expected wrangler.json, index.js or server.js)"
	ls -la /app/dist/server
	exit 1
fi
apachectl -D FOREGROUND
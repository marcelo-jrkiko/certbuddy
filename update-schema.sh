#!/bin/bash
set -a
source .env
set +a

echo "Updating Directus schema and generating TypeScript types..."
docker compose exec data_backend rm -f /directus/schemav1.yaml
docker compose exec data_backend npx directus schema snapshot schemav1.yaml
docker compose cp data_backend:/directus/schemav1.yaml ./shared/Schema.yaml

echo "Generating TypeScript types from Directus schema..."
npx directus-typescript-gen --host $VITE_DIRECTUS_URL --email $ADMIN_EMAIL --password $ADMIN_PASSWORD --outFile shared/Schema.d.ts
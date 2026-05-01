#!/bin/bash
set -a
source .env
set +a

docker compose exec data_backend npx directus schema snapshot schemav1.yaml
docker compose cp data_backend:/directus/schemav1.yaml ./shared/Schema.yaml

npx directus-typescript-gen --host $VITE_DIRECTUS_URL --email $ADMIN_EMAIL --password $ADMIN_PASSWORD --outFile shared/Schema.d.ts
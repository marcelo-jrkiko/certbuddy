#!/bin/bash
set -a
source .env
set +a

docker compose cp ./shared/Schema.yaml data_backend:/directus/schemav1.yaml 
docker compose exec data_backend npx directus schema apply schemav1.yaml

#!/bin/bash
set -e

DB_PATH="/data/marutto-legal.sqlite"

# If Litestream is configured, restore from replica on startup
if [ -n "$LITESTREAM_REPLICA_BUCKET" ]; then
  echo "Litestream configured — restoring database if replica exists..."
  if ! litestream restore -if-db-not-exists -if-replica-exists "$DB_PATH"; then
    echo "WARNING: Litestream restore failed — starting with fresh database"
  fi

  echo "Running Prisma migrations..."
  npm run setup

  echo "Starting app with Litestream replication..."
  exec litestream replicate -exec "node build/server/index.js"
else
  echo "Litestream not configured — starting without backup..."
  npm run setup
  exec node build/server/index.js
fi

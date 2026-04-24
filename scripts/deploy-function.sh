#!/bin/bash
# Prepares and deploys the havenspace-api Appwrite Function

set -e

FUNCTION_DIR="functions/havenspace-api"

echo "→ Copying server/ into function folder..."
cp -r server "$FUNCTION_DIR/server"

echo "→ Installing PHP dependencies..."
cd "$FUNCTION_DIR"
composer install --no-dev --optimize-autoloader
cd ../..

echo "→ Deploying to Appwrite..."
appwrite deploy functions --function-id havenspace-api

echo "→ Cleaning up copied server/ from function folder..."
rm -rf "$FUNCTION_DIR/server"

echo "✓ Done!"

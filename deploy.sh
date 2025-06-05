#!/bin/bash

set -e 

export $(grep -v '^#' .env | xargs)
BUILD_DIR=build/client 

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Deploying..."
npx serverless deploy --verbose
aws s3 sync $BUILD_DIR s3://$S3_STATIC_BUCKET --delete

echo "Deployment complete!"

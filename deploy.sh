#!/bin/bash

set -e 

export $(grep -v '^#' .env | xargs)

npm ci
npm run build
sls deploy --verbose
aws s3 sync ./services/web/build/client s3://$S3_STATIC_BUCKET --delete

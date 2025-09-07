#!/bin/bash

# Default deployment branch (can be overridden by .deploy-branch file)
DEFAULT_BRANCH="main"

# If .deploy-branch file exists, read branch name from it
if [ -f .deploy-branch ]; then
  FILE_BRANCH=$(cat .deploy-branch | tr -d ' \t\n\r')
  if [ -n "$FILE_BRANCH" ]; then
    DEFAULT_BRANCH="$FILE_BRANCH"
  fi
fi

# Ensure we're on the correct branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "$DEFAULT_BRANCH" ]; then
    echo "Switching to deployment branch: $DEFAULT_BRANCH"
    git checkout $DEFAULT_BRANCH
fi

# Pull latest changes (non-interactive rebase)
git fetch origin $DEFAULT_BRANCH
git reset --hard origin/$DEFAULT_BRANCH

# Run build and deploy
npm ci --no-audit --no-fund
npm run build-production

# Run database migrations before starting/reloading
npm run db:migrate-production

# Start or reload PM2 app with updated environment
if pm2 describe chat-app >/dev/null 2>&1; then
  pm2 reload chat-app --update-env
else
  pm2 start ecosystem.config.js
fi

echo "Deployment prepared from branch: $DEFAULT_BRANCH"
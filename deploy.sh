#!/bin/bash

# Default deployment branch
DEFAULT_BRANCH="cursor/build-and-deploy-with-storage-error-00f3"

# Ensure we're on the correct branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "$DEFAULT_BRANCH" ]; then
    echo "Switching to deployment branch: $DEFAULT_BRANCH"
    git checkout $DEFAULT_BRANCH
fi

# Pull latest changes
git pull origin $DEFAULT_BRANCH

# Run build and deploy
npm install
npm run build

echo "Deployment prepared from branch: $DEFAULT_BRANCH"
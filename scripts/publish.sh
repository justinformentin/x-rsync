#!/bin/bash
# Usage: ./scripts/publish.sh [major|minor|patch]
# Defaults to patch if no argument given

set -e

BUMP=${1:-patch}

if [[ "$BUMP" != "major" && "$BUMP" != "minor" && "$BUMP" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch]"
  exit 1
fi

echo "Bumping $BUMP version..."
npm version "$BUMP" --no-git-tag-version

VERSION=$(node -p "require('./package.json').version")
echo "New version: $VERSION"

echo "Building..."
npm run build

echo "Publishing v$VERSION to npm..."
npm publish

echo "Tagging and pushing to git..."
git add package.json
git commit -m "Build and release $VERSION"
git tag "v$VERSION"
git push
git push --tags

echo "Done! Published $VERSION"

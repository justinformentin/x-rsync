#!/bin/bash
# Test the package before publishing

set -e

echo "🔨 Building package..."
npm run build

echo ""
echo "📦 Creating tarball..."
npm pack

echo ""
echo "📋 Package contents:"
tar -tzf x-rsync-*.tgz | head -20

echo ""
echo "✅ Package built successfully!"
echo ""
echo "To test locally:"
echo "  npm link                    # Create global symlink"
echo "  npm install ./x-rsync-*.tgz  # Test actual install"
echo ""
echo "To test in another project:"
echo "  cd /path/to/test-project"
echo "  npm link x-rsync"
echo "  # or"
echo "  npm install $(pwd)/x-rsync-*.tgz"

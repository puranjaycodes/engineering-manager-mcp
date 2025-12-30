#!/bin/bash
# Build script for engineering-manager-mcp

echo "Building Engineering Manager MCP..."
echo "=================================="

# Navigate to project directory
PROJECT_DIR="/Users/puranjay/engineering-manager-mcp"

# Check if TypeScript compiler exists
if ! command -v tsc &> /dev/null; then
    echo "TypeScript compiler (tsc) not found. Installing..."
    npm install -g typescript
fi

# Compile TypeScript files
echo "Compiling TypeScript files..."
tsc --project "$PROJECT_DIR/tsconfig.json"

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "The compiled JavaScript files are in the dist/ directory"
    echo ""
    echo "⚠️  IMPORTANT: You need to restart your MCP server for changes to take effect!"
    echo "If using Claude Desktop, restart the Claude app."
    echo "If running standalone, restart with: npm run start"
else
    echo "❌ Build failed. Please check for TypeScript errors."
    exit 1
fi

#!/bin/bash

# ================================================
# Prepare Repository for GitHub
# ================================================

echo "🚀 Preparing Engineering Manager MCP for GitHub"
echo "==============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Clean up sensitive and build files
echo "🧹 Cleaning up repository..."

# Remove sensitive files
rm -f .env
rm -f claude_desktop_config.json
rm -f claude_config_snippet.json

# Clean build artifacts
rm -rf dist/
rm -rf node_modules/
rm -rf logs/*.log
rm -f *.pdf

# Remove backup files
find . -name "*.backup" -type f -delete
find . -name "*.backup.ts" -type f -delete
find . -name "*.bak" -type f -delete

echo -e "${GREEN}✅ Cleanup complete${NC}"

# Verify required files exist
echo ""
echo "📋 Checking required files..."

required_files=(
    "README.md"
    "LICENSE"
    "package.json"
    "tsconfig.json"
    ".env.example"
    ".gitignore"
    "CONTRIBUTING.md"
    "CHANGELOG.md"
    "setup.sh"
    "src/index.ts"
    "src/jira-handler.ts"
    "src/slack-handler.ts"
    "src/pdf-generator.ts"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
        echo -e "${RED}❌ Missing: $file${NC}"
    else
        echo -e "${GREEN}✅ Found: $file${NC}"
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Some required files are missing!${NC}"
    echo "Please ensure all files are present before uploading to GitHub."
    exit 1
fi

# Initialize git repository if not already initialized
if [ ! -d .git ]; then
    echo ""
    echo "📦 Initializing git repository..."
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${GREEN}✅ Git repository already initialized${NC}"
fi

# Create initial commit
echo ""
echo "📝 Preparing for initial commit..."

# Add all files respecting .gitignore
git add .

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short

echo ""
echo "==============================================="
echo -e "${GREEN}✨ Repository is ready for GitHub!${NC}"
echo "==============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create a new repository on GitHub:"
echo "   ${GREEN}https://github.com/new${NC}"
echo ""
echo "2. Add the remote origin:"
echo "   ${GREEN}git remote add origin https://github.com/YOUR_USERNAME/engineering-manager-mcp.git${NC}"
echo ""
echo "3. Create initial commit:"
echo "   ${GREEN}git commit -m \"Initial commit: Engineering Manager MCP Server\"${NC}"
echo ""
echo "4. Push to GitHub:"
echo "   ${GREEN}git branch -M main${NC}"
echo "   ${GREEN}git push -u origin main${NC}"
echo ""
echo "5. Add topics to your repository:"
echo "   - mcp"
echo "   - jira"
echo "   - slack"
echo "   - engineering-management"
echo "   - typescript"
echo "   - automation"
echo ""
echo "6. Consider adding:"
echo "   - GitHub Actions for CI/CD"
echo "   - Issue templates"
echo "   - Pull request templates"
echo "   - Security policy"
echo ""
echo -e "${YELLOW}⚠️  Remember:${NC}"
echo "   - Never commit .env file with real credentials"
echo "   - Review files before pushing"
echo "   - Add collaborators if needed"
echo "   - Enable GitHub Pages for documentation if desired"
echo ""
echo -e "${GREEN}Good luck with your open source project! 🎉${NC}"

#!/bin/bash

# ================================================
# Engineering Manager MCP Server - Setup Script
# ================================================

echo "🚀 Engineering Manager MCP Server Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check for Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm $(npm -v) detected"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_success "Dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    print_success ".env file created from template"
    print_warning "Please edit .env file with your credentials"
else
    print_success ".env file already exists"
fi

# Create logs directory
echo ""
echo "Creating logs directory..."
mkdir -p logs
print_success "Logs directory created"

# Build the project
echo ""
echo "Building the project..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Build failed. Please check for TypeScript errors."
    exit 1
fi
print_success "Project built successfully"

# Check for required environment variables
echo ""
echo "Checking configuration..."
source .env 2>/dev/null

if [ -z "$JIRA_BASE_URL" ] || [ -z "$JIRA_EMAIL" ] || [ -z "$JIRA_API_TOKEN" ]; then
    print_warning "Jira credentials not configured in .env file"
    echo ""
    echo "Please configure the following in .env:"
    echo "  - JIRA_BASE_URL"
    echo "  - JIRA_EMAIL"
    echo "  - JIRA_API_TOKEN"
    echo ""
    echo "Get your Jira API token from:"
    echo "https://id.atlassian.com/manage/api-tokens"
else
    print_success "Jira configuration detected"
fi

if [ -z "$SLACK_BOT_TOKEN" ]; then
    print_warning "Slack token not configured (optional)"
else
    print_success "Slack configuration detected"
fi

# Generate Claude Desktop configuration
echo ""
echo "Generating Claude Desktop configuration..."
CURRENT_DIR=$(pwd)
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

cat > claude_config_snippet.json << EOF
{
  "mcpServers": {
    "engineering-manager": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
EOF

print_success "Configuration snippet created: claude_config_snippet.json"

# Platform-specific instructions
echo ""
echo "========================================"
echo "✨ Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your credentials:"
echo "   ${GREEN}vim .env${NC}"
echo ""
echo "2. Add the MCP server to Claude Desktop:"
echo "   - Open: ${GREEN}$CONFIG_PATH${NC}"
echo "   - Add the configuration from: ${GREEN}claude_config_snippet.json${NC}"
echo ""
echo "3. Restart Claude Desktop:"
echo "   - Quit Claude Desktop completely (Cmd+Q on Mac)"
echo "   - Reopen Claude Desktop"
echo "   - Look for the 🔌 icon to confirm connection"
echo ""
echo "4. Test the integration:"
echo "   Try: \"Generate a daily standup report for board [YOUR_BOARD_ID]\""
echo ""
echo "📚 Documentation: ${GREEN}README.md${NC}"
echo "📝 Logs location: ${GREEN}logs/${NC}"
echo ""
print_success "Happy managing! 🎯"

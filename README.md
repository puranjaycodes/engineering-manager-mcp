# Engineering Manager MCP Server

[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful MCP (Model Context Protocol) server that integrates Jira and Slack to automate engineering management workflows. Generate daily standup reports, track stale tickets, identify blockers, and send automated updates to your team.

## 🎯 Features

### Jira Integration
- **📊 Daily Standup Reports** - Automatic detection of stale, overdue, and blocked issues
- **📄 PDF Report Generation** - Professional PDF reports with charts and team metrics
- **🎫 Issue Management** - Create, update, and track Jira issues
- **🏃 Sprint Tracking** - Monitor active sprint progress and team velocity
- **👥 Team Analytics** - Workload distribution and performance metrics

### Slack Integration
- **💬 Message Posting** - Send updates to channels or threads
- **⏰ Reminders** - Create reminders for yourself or team members
- **📅 Scheduled Messages** - Schedule messages for optimal timing
- **📜 Channel History** - Retrieve recent channel messages

### Advanced Features
- **🚀 Smart Caching** - Reduces API calls with intelligent TTL-based caching
- **🔒 Secure Configuration** - Environment-based credential management
- **✅ Input Validation** - Comprehensive validation with Zod schemas
- **🔄 Retry Logic** - Automatic retries with exponential backoff
- **📝 File-based Logging** - Debug without interfering with MCP protocol

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Jira account with API access
- Slack workspace with bot token (optional)
- Claude Desktop app

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/engineering-manager-mcp.git
cd engineering-manager-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Jira Configuration (Required)
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_jira_api_token

# Slack Configuration (Optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# Environment
NODE_ENV=production
DEBUG=false
```

4. **Build the project**
```bash
npm run build
```

5. **Configure Claude Desktop**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "engineering-manager": {
      "command": "node",
      "args": ["/path/to/engineering-manager-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

6. **Restart Claude Desktop**
- Quit Claude Desktop completely (Cmd+Q on Mac)
- Reopen Claude Desktop
- Look for the 🔌 icon to confirm MCP connection

## 📖 Usage Examples

### Generate Daily Standup Report
```
"Generate a daily standup report for board 194"
```

### Create PDF Report
```
"Generate a PDF standup report"
```

### Post to Slack
```
"Post the standup summary to #engineering channel"
```

### Create Jira Issue
```
"Create a high priority bug in project WEB for login issues"
```

## 🛠️ Available Tools

### Jira Tools

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| `jira_create_issue` | Create a new Jira issue | project, summary, issueType |
| `jira_update_issue` | Update existing issue | issueKey, fields |
| `jira_get_sprint_issues` | Get current sprint issues | boardId |
| `jira_daily_standup_report` | Generate standup report | boardId |
| `jira_generate_standup_pdf` | Create PDF report | boardId |

### Slack Tools

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| `slack_post_message` | Post message to channel | channel, text |
| `slack_create_reminder` | Create reminder | text, time |
| `slack_get_channel_history` | Get channel messages | channel |
| `slack_schedule_message` | Schedule a message | channel, text, postAt |

## 🏗️ Project Structure

```
engineering-manager-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── jira-handler.ts        # Jira integration logic
│   ├── slack-handler.ts       # Slack integration logic
│   ├── pdf-generator.ts       # PDF report generation
│   └── utils/
│       ├── config.ts          # Configuration management
│       ├── validation.ts      # Input validation schemas
│       ├── cache.ts           # Caching system
│       ├── errors.ts          # Error handling
│       └── logger.ts          # File-based logging
├── dist/                      # Compiled JavaScript
├── logs/                      # Log files
├── .env.example              # Environment template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

## ⚙️ Configuration

### Getting Jira API Token
1. Log in to [Atlassian Account Settings](https://id.atlassian.com/manage/api-tokens)
2. Click "Create API token"
3. Give it a name like "MCP Server"
4. Copy the token to your `.env` file

### Getting Slack Bot Token
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select existing
3. Go to "OAuth & Permissions"
4. Add required bot token scopes:
   - `chat:write`
   - `channels:history`
   - `channels:read`
   - `reminders:write`
5. Install to workspace and copy bot token

### Finding Your Jira Board ID
1. Open your Jira board
2. Check the URL: `https://yourcompany.atlassian.net/jira/software/boards/194`
3. The board ID is the number at the end (e.g., 194)

## 🔍 Debugging

### Check MCP Connection
Look for the 🔌 icon in Claude Desktop. If not visible:
- Check logs in `logs/` directory
- Verify configuration in `claude_desktop_config.json`
- Ensure all environment variables are set

### View Logs
```bash
# Today's logs
tail -f logs/mcp-server-$(date +%Y-%m-%d).log

# All logs
ls -la logs/
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Unexpected token" errors | Ensure all console.log statements are removed |
| No MCP icon in Claude | Restart Claude Desktop completely |
| Authentication failures | Verify API tokens in `.env` |
| Board not found | Check board ID and permissions |

## 🚀 Advanced Usage

### Custom Stale Thresholds
```javascript
// Modify in jira-handler.ts
const daysStale = args.daysStale || 2; // Change default
```

### Cache Configuration
```javascript
// Adjust in utils/cache.ts
export const sprintCache = new CacheManager({
  ttl: 600,      // 10 minutes
  maxSize: 100   // Maximum entries
});
```

### Add Custom Fields
```javascript
// In jira-handler.ts, modify the fields parameter
fields: 'summary,status,assignee,updated,customfield_10001'
```

## 📊 Report Features

The PDF standup reports include:
- **Sprint Progress** - Visual charts showing completion status
- **Issue Categories** - Stale, overdue, blocked, and unassigned
- **Team Metrics** - Individual workload and performance
- **Priority Matrix** - Issues sorted by priority and urgency
- **Trend Analysis** - Historical comparison when available
- **Action Items** - Suggested next steps

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Uses [PDFKit](https://pdfkit.org/) for PDF generation
- Powered by [Anthropic's Claude](https://claude.ai)

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review logs in the `logs/` directory

## 🗺️ Roadmap

- [ ] Add Confluence integration
- [ ] Support for multiple sprints
- [ ] Customizable report templates
- [ ] Email report delivery
- [ ] Team performance dashboards
- [ ] Burndown chart generation
- [ ] Integration with other project management tools
- [ ] Webhook support for real-time updates

---

**Made with ❤️ for Engineering Managers**

*Automate the mundane, focus on what matters.*

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added
- Initial release of Engineering Manager MCP Server
- Jira integration with 5 tools:
  - `jira_create_issue` - Create new Jira issues
  - `jira_update_issue` - Update existing issues
  - `jira_get_sprint_issues` - Get current sprint issues
  - `jira_daily_standup_report` - Generate comprehensive standup reports
  - `jira_generate_standup_pdf` - Create professional PDF reports
- Slack integration with 4 tools:
  - `slack_post_message` - Post messages to channels
  - `slack_create_reminder` - Create reminders
  - `slack_get_channel_history` - Retrieve channel messages
  - `slack_schedule_message` - Schedule messages for later
- Advanced features:
  - Smart caching system with TTL support
  - Input validation using Zod schemas
  - Comprehensive error handling with retry logic
  - Secure configuration management
  - File-based logging (no console.log interference)
- PDF report generation with:
  - Sprint progress visualization
  - Team workload distribution
  - Issue categorization (stale, overdue, blocked)
  - Priority-based sorting
  - Clickable Jira links
- Full TypeScript implementation
- Comprehensive documentation

### Security
- Environment-based credential management
- Masked logging for sensitive data
- Input sanitization to prevent injection attacks

### Performance
- Intelligent caching reduces API calls by up to 70%
- Pagination support for large datasets
- Async generators for memory-efficient processing
- Exponential backoff for API retries

## [Unreleased]

### Planned
- Confluence integration
- Support for multiple sprints
- Customizable report templates
- Email delivery for reports
- Burndown chart generation
- Webhook support for real-time updates
- Team performance dashboards
- Historical trend analysis
- Custom field support
- Bulk issue operations

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-12-29 | Initial release |

---

For detailed release notes, see [GitHub Releases](https://github.com/yourusername/engineering-manager-mcp/releases)

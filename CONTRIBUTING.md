# Contributing to Engineering Manager MCP Server

First off, thank you for considering contributing to Engineering Manager MCP Server! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and considerate in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and expected**
- **Include logs from the `logs/` directory**
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following the coding standards
4. **Add tests** if applicable
5. **Ensure tests pass**: `npm test`
6. **Update documentation** as needed
7. **Write clear commit messages**
8. **Submit a pull request**

## Development Setup

1. **Clone your fork**
```bash
git clone https://github.com/yourusername/engineering-manager-mcp.git
cd engineering-manager-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your test credentials
```

4. **Build the project**
```bash
npm run build
```

5. **Run in development mode**
```bash
npm run dev
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Provide proper types (avoid `any`)
- Use interfaces for object shapes
- Document complex types

### Code Style
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length of 100 characters
- Use meaningful variable and function names

### Comments
- Write self-documenting code
- Add comments for complex logic
- Use JSDoc for public functions
- Keep comments up-to-date with code changes

### Error Handling
- Always handle errors appropriately
- Use custom error classes
- Provide meaningful error messages
- Log errors to the file system, not console

### Testing
- Write unit tests for new features
- Ensure existing tests pass
- Aim for good test coverage
- Test edge cases

## Project Structure

```
src/
├── index.ts              # Entry point - don't modify unless necessary
├── jira-handler.ts       # Jira integration
├── slack-handler.ts      # Slack integration
├── pdf-generator.ts      # PDF generation
├── types/               # TypeScript type definitions
│   └── index.ts
└── utils/               # Utility modules
    ├── cache.ts         # Caching logic
    ├── config.ts        # Configuration management
    ├── errors.ts        # Error handling
    ├── logger.ts        # Logging utility
    └── validation.ts    # Input validation
```

## Adding New Features

### Adding a New Jira Tool

1. Add tool definition in `jira-handler.ts`:
```typescript
{
  name: 'jira_new_tool',
  description: 'Description of what it does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define parameters
    },
    required: ['param1']
  }
}
```

2. Add handler case in `handleJiraTool`:
```typescript
case 'jira_new_tool': {
  // Implementation
}
```

3. Add validation schema in `utils/validation.ts`
4. Update README with new tool documentation

### Adding a New Slack Tool

Follow similar pattern as Jira tools but in `slack-handler.ts`

## Commit Guidelines

- Use clear and meaningful commit messages
- Follow conventional commits format:
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `style:` Code style changes
  - `refactor:` Code refactoring
  - `test:` Test additions or changes
  - `chore:` Maintenance tasks

Example:
```
feat: add burndown chart generation to PDF reports

- Calculate sprint burndown data
- Add chart to PDF report
- Include ideal vs actual progress
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing
1. Build the project: `npm run build`
2. Configure Claude Desktop with local build
3. Test each tool thoroughly
4. Check logs for errors

## Documentation

- Update README.md for user-facing changes
- Update inline comments for code changes
- Update this file for process changes
- Include examples for new features

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a pull request
4. After merge, tag the release
5. Create GitHub release with notes

## Questions?

Feel free to open an issue for questions or join our discussions. We're here to help!

## Recognition

Contributors will be recognized in our README. Thank you for your contributions!

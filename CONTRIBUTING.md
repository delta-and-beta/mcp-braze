# Contributing to MCP Braze Server

Thank you for your interest in contributing to the MCP Braze Server! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/mcp-braze.git`
3. Add upstream remote: `git remote add upstream https://github.com/delta-beta/mcp-braze.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run in development mode
npm run dev

# Run tests
npm test
```

## Development Guidelines

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run typecheck
```

### TypeScript Standards

- Use strict mode
- Avoid `any` types
- Provide explicit return types
- Document complex functions
- Use interfaces over type aliases for objects

### Testing Requirements

All contributions must include appropriate tests:

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API interactions with mocks
3. **E2E Tests**: Test complete workflows

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or changes
- `refactor:` Code refactoring
- `style:` Code style changes
- `perf:` Performance improvements
- `chore:` Maintenance tasks

Examples:
```
feat: add support for Canvas journeys
fix: resolve rate limiting issue with campaign endpoints
docs: update README with deployment instructions
test: add integration tests for user tracking
```

## Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout develop
   git merge upstream/develop
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes**:
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

4. **Test thoroughly**:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

5. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

7. **Create Pull Request**:
   - Go to GitHub and create a PR from your branch
   - Target the `develop` branch (not `main`)
   - Fill out the PR template completely

### PR Requirements

- [ ] Tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] No merge conflicts

## Adding New Features

### New Tool Implementation

1. **Define the schema** in `src/handlers/tools.ts`:
   ```typescript
   const myToolSchema = z.object({
     param1: z.string(),
     param2: z.number().optional(),
   });
   ```

2. **Add tool handler**:
   ```typescript
   async my_tool(args: unknown) {
     const params = myToolSchema.parse(args);
     // Implementation
   }
   ```

3. **Register tool definition**:
   ```typescript
   {
     name: 'my_tool',
     description: 'Tool description',
     inputSchema: myToolSchema,
   }
   ```

4. **Add tests**:
   - Unit test for the handler
   - Integration test with mock API
   - E2E test for complete workflow

### New Braze API Integration

1. **Add types** in `src/braze/types.ts`
2. **Implement client method** in `src/braze/client.ts`
3. **Add access control** if needed
4. **Create tool handler**
5. **Document the feature**

## Documentation

### Code Documentation

Document all public functions:

```typescript
/**
 * Brief description of the function
 * 
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @returns Description of return value
 * @throws {ErrorType} Description of when this error occurs
 * 
 * @example
 * ```typescript
 * const result = await myFunction('value1', 42);
 * ```
 */
export async function myFunction(param1: string, param2: number): Promise<Result> {
  // Implementation
}
```

### README Updates

Update README.md when adding:
- New features
- Configuration options
- Usage examples
- Deployment methods

### API Documentation

Document new tools in the README with:
- Purpose
- Parameters
- Example usage
- Common errors

## Testing Guidelines

### Unit Tests

```typescript
describe('BrazeClient', () => {
  describe('trackUser', () => {
    it('should track user attributes successfully', async () => {
      // Test implementation
    });

    it('should handle rate limit errors', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

Use mock responses:

```typescript
mock.onPost('/users/track').reply(200, {
  message: 'success',
  attributes_processed: 1,
});
```

### E2E Tests

Test complete workflows:

```typescript
it('should create campaign and retrieve analytics', async () => {
  // Create campaign
  // Schedule campaign
  // Get analytics
  // Verify results
});
```

## Security Considerations

### Never Commit

- API keys or secrets
- User PII
- Production data
- Credentials

### Always Consider

- Input validation
- Rate limiting
- Access control
- Data sanitization
- Error messages (don't leak sensitive info)

## Performance Guidelines

### Optimize for

- Minimal API calls
- Efficient caching
- Batch operations
- Concurrent requests (with limits)

### Avoid

- Synchronous blocking operations
- Unnecessary data fetching
- Large memory allocations
- Unbounded loops

## Release Process

1. **Version Bump**:
   ```bash
   npm version minor  # or major/patch
   ```

2. **Update Changelog**:
   - Add version section
   - List all changes
   - Credit contributors

3. **Create Release PR**:
   - From `develop` to `main`
   - Include changelog
   - Tag after merge

## Questions and Support

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: support@delta-beta.com

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to MCP Braze Server!
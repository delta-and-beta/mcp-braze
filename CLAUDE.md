# CLAUDE.md - Project Guidelines

This document contains project-specific instructions for AI assistants working on the MCP Braze server.

## Project Overview

The MCP Braze server is a Model Context Protocol implementation that provides integration with Braze's marketing automation platform. It follows the same architecture and quality standards as the MCP Airtable server.

## Development Workflow

### Git Flow

We follow Git Flow for version management:

1. **Main Branch**: `main` - Production-ready code
2. **Development Branch**: `develop` - Integration branch
3. **Feature Branches**: `feature/*` - New features
4. **Release Branches**: `release/*` - Release preparation
5. **Hotfix Branches**: `hotfix/*` - Emergency fixes

### Branch Naming

- Features: `feature/add-canvas-support`
- Bugfixes: `bugfix/fix-rate-limiting`
- Hotfixes: `hotfix/critical-auth-fix`
- Releases: `release/v1.2.0`

### Commit Messages

Follow conventional commits:
```
feat: add support for Canvas journeys
fix: resolve rate limiting issue with campaign endpoints
docs: update README with deployment instructions
test: add integration tests for user tracking
refactor: improve error handling in BrazeClient
```

## Code Standards

### TypeScript Guidelines

1. **Strict Mode**: Always use TypeScript strict mode
2. **Type Safety**: Avoid `any` types, use proper interfaces
3. **Null Checks**: Handle null/undefined cases explicitly
4. **Error Types**: Use custom error classes from `utils/errors.ts`

### API Integration

1. **Rate Limiting**: Always respect Braze API limits
2. **Error Handling**: Implement retry logic for transient failures
3. **Validation**: Use Zod schemas for input validation
4. **Logging**: Log all API calls with sanitized data

### Security Requirements

1. **Never Log**:
   - API keys or tokens
   - User PII (emails, phone numbers)
   - Sensitive custom attributes

2. **Always Mask**:
   - External user IDs in logs
   - Email addresses in responses
   - Phone numbers in exports

3. **Access Control**:
   - Check permissions before operations
   - Validate workspace access
   - Enforce campaign type restrictions

## Testing Requirements

### Unit Tests

Test coverage requirements:
- BrazeClient: 90%+ coverage
- Tool handlers: 95%+ coverage
- Access control: 100% coverage
- Error handling: 100% coverage

### Integration Tests

Mock Braze API responses for:
- Campaign operations
- User tracking
- Segment management
- Analytics queries

### E2E Tests

Test complete workflows:
- Campaign creation to analytics
- User tracking to export
- Segment creation to campaign targeting

## Documentation Standards

### Code Documentation

```typescript
/**
 * Tracks user attributes and events in Braze
 * @param request - User tracking request with attributes/events
 * @throws {ValidationError} If request format is invalid
 * @throws {RateLimitError} If API rate limit exceeded
 * @throws {AccessControlError} If operation not permitted
 */
async trackUser(request: BrazeUserTrackRequest): Promise<void>
```

### API Documentation

Document all tools with:
- Purpose and use cases
- Required parameters
- Optional parameters
- Example requests
- Common errors

## Performance Guidelines

### Caching Strategy

1. **Cache User Profiles**: 1 hour TTL
2. **Cache Campaign Details**: 15 minutes TTL
3. **Cache Segment Info**: 30 minutes TTL
4. **Never Cache**: Analytics data, user events

### Batch Operations

1. **User Tracking**: Batch up to 75 users
2. **Event Tracking**: Batch up to 75 events
3. **Attribute Updates**: Batch up to 75 updates

### Queue Management

1. **Concurrency**: Max 10 parallel requests
2. **Rate Limit**: Respect per-minute limits
3. **Retry Policy**: Exponential backoff for failures

## Deployment Checklist

Before deploying:

1. [ ] All tests passing
2. [ ] Type checking clean
3. [ ] Linting clean
4. [ ] Documentation updated
5. [ ] Environment variables documented
6. [ ] Security review completed
7. [ ] Performance testing done
8. [ ] Access control tested

## Common Patterns

### Error Handling

```typescript
try {
  const result = await brazeOperation();
  return result;
} catch (error) {
  if (isRetryableError(error)) {
    // Implement retry logic
  }
  logger.error('Operation failed', sanitizeLogData({ error }));
  throw formatErrorForMcp(error);
}
```

### Access Control

```typescript
// Always check access before operations
this.accessController.checkAccess({
  operation: 'write',
  workspace: campaign.workspace,
  campaignType: campaign.type,
});
```

### Data Sanitization

```typescript
// Always sanitize before logging
const sanitized = this.accessController.maskPiiFields(userData);
logger.info('User data processed', sanitized);
```

## Braze-Specific Considerations

### API Endpoints

Different Braze clusters have different endpoints:
- US-01: `https://rest.iad-01.braze.com`
- US-03: `https://rest.iad-03.braze.com`
- EU-01: `https://rest.fra-01.braze.eu`

### Liquid Templating

Support Liquid syntax in:
- Email content
- Push notifications
- In-app messages
- Content blocks

### Campaign Types

Handle differences between:
- Email campaigns (HTML/plaintext)
- Push notifications (title/body/image)
- SMS (character limits)
- In-app messages (triggers)

## Maintenance Tasks

### Regular Updates

1. **Weekly**: Update dependencies
2. **Monthly**: Review error logs
3. **Quarterly**: Performance audit
4. **Yearly**: Security audit

### Monitoring

Track:
- API error rates
- Rate limit hits
- Cache hit rates
- Response times

## Future Enhancements

Priority features to implement:
1. Canvas (journey) support
2. Connected Content integration
3. Predictive analytics
4. Multi-language management
5. Advanced A/B testing

## Support Resources

- [Braze API Docs](https://www.braze.com/docs/api/basics/)
- [MCP Specification](https://modelcontextprotocol.io/docs)
- Internal Slack: #mcp-braze
- GitHub Issues: Track bugs and features
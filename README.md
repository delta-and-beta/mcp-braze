# MCP Braze Server

A Model Context Protocol (MCP) server that provides seamless integration with Braze's marketing automation platform. This server enables AI assistants to interact with Braze APIs for campaign management, user tracking, segmentation, and analytics.

## Features

### Campaign Management
- List, create, and manage email/push/SMS campaigns
- Schedule and trigger campaign delivery
- Update campaign settings and content
- Track campaign performance metrics

### User Management
- Track user attributes, events, and purchases
- Retrieve and update user profiles
- Delete user data (GDPR compliance)
- Export user segments

### Segmentation
- Create and manage user segments with filters
- Get segment analytics and size
- Natural language segment creation
- Dynamic segment updates

### Content Management
- Manage reusable content blocks
- Work with email templates
- Support for Liquid templating

### Analytics & Reporting
- Campaign performance metrics
- KPI tracking (DAU, MAU, revenue)
- Export analytics data
- Real-time reporting

## Installation

### Prerequisites
- Node.js 18 or higher
- Braze REST API key
- Redis (optional, for caching)

### Local Installation

```bash
# Clone the repository
git clone https://github.com/delta-beta/mcp-braze.git
cd mcp-braze

# Install dependencies
npm install

# Build the project
npm run build

# Copy environment variables
cp .env.example .env
# Edit .env with your Braze credentials
```

### Claude Desktop Configuration

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "braze": {
      "command": "node",
      "args": ["/path/to/mcp-braze/dist/index.js"],
      "env": {
        "BRAZE_API_KEY": "your-api-key",
        "BRAZE_API_URL": "https://rest.iad-01.braze.com",
        "BRAZE_APP_ID": "your-app-id"
      }
    }
  }
}
```

## Configuration

### Required Environment Variables

```bash
# Braze API Configuration
BRAZE_API_KEY=your-rest-api-key
BRAZE_API_URL=https://rest.iad-01.braze.com  # Your cluster endpoint
BRAZE_APP_ID=your-app-id
```

### Optional Configuration

```bash
# Access Control
BRAZE_ALLOWED_WORKSPACES=workspace1,workspace2
BRAZE_ALLOWED_CAMPAIGN_TYPES=email,push,sms
BRAZE_ALLOWED_SEGMENTS=segment1,segment2
BRAZE_READ_ONLY_MODE=false
BRAZE_MASK_PII_FIELDS=true

# Redis (for caching)
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600

# Rate Limiting
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=1000
BRAZE_ENABLE_QUEUE=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Usage Examples

### Campaign Management

```javascript
// Create an email campaign
{
  "tool": "create_campaign",
  "arguments": {
    "name": "Summer Sale 2024",
    "type": "email",
    "description": "Promotional campaign for summer collection",
    "segments": ["high_value_customers"],
    "message": {
      "subject": "🌞 Summer Sale - Up to 50% Off!",
      "body": "<html>...</html>",
      "from": "sales@example.com"
    }
  }
}

// Schedule campaign
{
  "tool": "schedule_campaign",
  "arguments": {
    "campaign_id": "campaign_123",
    "time": "2024-07-01T10:00:00Z",
    "timezone": "America/New_York"
  }
}

// Get campaign analytics
{
  "tool": "get_campaign_analytics",
  "arguments": {
    "campaign_id": "campaign_123",
    "length": 7
  }
}
```

### User Management

```javascript
// Track user events
{
  "tool": "track_user",
  "arguments": {
    "attributes": [{
      "external_id": "user_123",
      "email": "user@example.com",
      "first_name": "John",
      "custom_attributes": {
        "lifetime_value": 1250.50,
        "preferred_category": "electronics"
      }
    }],
    "events": [{
      "external_id": "user_123",
      "name": "product_viewed",
      "time": "2024-06-15T14:30:00Z",
      "properties": {
        "product_id": "SKU123",
        "category": "electronics"
      }
    }]
  }
}

// Get user profile
{
  "tool": "get_user_profile",
  "arguments": {
    "user_id": "user_123",
    "id_type": "external_id"
  }
}
```

### Segmentation

```javascript
// Create a segment
{
  "tool": "create_segment",
  "arguments": {
    "name": "High Value Dormant Users",
    "description": "Users with LTV > $100 who haven't engaged in 30 days",
    "filters": [{
      "AND": [
        {
          "attribute_name": "lifetime_value",
          "comparison": "greater_than",
          "value": 100
        },
        {
          "attribute_name": "last_engaged",
          "comparison": "less_than",
          "value": "30_days_ago"
        }
      ]
    }]
  }
}
```

### Natural Language Examples

You can use natural language with AI assistants:

- "Create an email campaign for users who haven't purchased in 30 days"
- "Show me the performance metrics for our last push notification campaign"
- "Export all users in the VIP segment"
- "Update John Doe's email preferences"

## Access Control

The server supports fine-grained access control:

### Workspace Restrictions
Control which Braze workspaces can be accessed:
```bash
BRAZE_ALLOWED_WORKSPACES=production,staging
```

### Campaign Type Restrictions
Limit operations to specific campaign types:
```bash
BRAZE_ALLOWED_CAMPAIGN_TYPES=email,push
```

### Segment Restrictions
Control access to specific segments:
```bash
BRAZE_ALLOWED_SEGMENTS=segment_id_1,segment_id_2
# Or use * for all segments
BRAZE_ALLOWED_SEGMENTS=*
```

### Read-Only Mode
Enable read-only access for safety:
```bash
BRAZE_READ_ONLY_MODE=true
```

### PII Masking
Automatically mask sensitive user data:
```bash
BRAZE_MASK_PII_FIELDS=true
```

## Rate Limiting

The server implements intelligent rate limiting:

- Configurable requests per minute
- Automatic retry with exponential backoff
- Queue system for batch operations
- Respects Braze API rate limits

## Caching

Optional Redis caching for improved performance:

- User profile caching
- Campaign details caching
- Segment information caching
- Configurable TTL

## Security

### API Key Security
- Never log API keys
- Sanitize sensitive data in logs
- Secure environment variable handling

### Data Protection
- Field-level encryption options
- PII masking capabilities
- Audit logging for compliance

### GDPR Compliance
- User deletion support
- Data export functionality
- Consent tracking

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Zeabur

1. Fork this repository
2. Connect your GitHub account to Zeabur
3. Create a new project and select this repository
4. Add environment variables in Zeabur dashboard
5. Deploy

### Railway

1. Install Railway CLI
2. Run `railway login`
3. Run `railway init` in the project directory
4. Add environment variables
5. Run `railway up`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your API key is correct
   - Check API endpoint matches your cluster
   - Ensure API key has necessary permissions

2. **Rate Limit Errors**
   - Reduce `BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE`
   - Enable queue mode with `BRAZE_ENABLE_QUEUE=true`

3. **Connection Issues**
   - Verify network connectivity
   - Check firewall rules
   - Ensure correct API URL for your cluster

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/delta-beta/mcp-braze/issues)
- [Documentation](https://github.com/delta-beta/mcp-braze/wiki)
- [Braze API Documentation](https://www.braze.com/docs/api/basics/)

## Roadmap

- [ ] Canvas (customer journey) support
- [ ] Connected Content integration
- [ ] AI-powered campaign optimization
- [ ] Multi-language content management
- [ ] Advanced A/B testing tools
- [ ] Predictive analytics integration
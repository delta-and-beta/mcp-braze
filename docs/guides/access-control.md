# Access Control Guide

This guide explains how to configure and use access control features in the MCP Braze server.

## Overview

The MCP Braze server provides fine-grained access control to ensure secure and compliant usage of Braze APIs. Access control operates at multiple levels:

1. **Workspace Level**: Control which Braze workspaces can be accessed
2. **Campaign Type Level**: Restrict operations to specific campaign types
3. **Segment Level**: Control access to user segments
4. **Operation Level**: Read-only mode and operation restrictions
5. **Data Level**: PII masking and field-level protection

## Configuration

### Workspace Restrictions

Control which Braze workspaces the server can access:

```bash
# Allow specific workspaces
BRAZE_ALLOWED_WORKSPACES=production,staging

# Allow all workspaces (use with caution)
BRAZE_ALLOWED_WORKSPACES=*
```

### Campaign Type Restrictions

Limit operations to specific campaign types:

```bash
# Allow only email and push campaigns
BRAZE_ALLOWED_CAMPAIGN_TYPES=email,push

# Allow all campaign types
BRAZE_ALLOWED_CAMPAIGN_TYPES=email,push,sms,webhook,in_app_message
```

### Segment Restrictions

Control access to user segments:

```bash
# Allow specific segments by ID
BRAZE_ALLOWED_SEGMENTS=segment_123,segment_456

# Allow all segments
BRAZE_ALLOWED_SEGMENTS=*
```

### Read-Only Mode

Enable read-only access for safety:

```bash
# Enable read-only mode
BRAZE_READ_ONLY_MODE=true
```

In read-only mode:
- ✅ Can list campaigns, users, segments
- ✅ Can get analytics and reports
- ❌ Cannot create or update resources
- ❌ Cannot send campaigns
- ❌ Cannot delete data

### PII Masking

Automatically mask sensitive user data:

```bash
# Enable PII masking (default: true)
BRAZE_MASK_PII_FIELDS=true
```

Masked fields include:
- Email addresses
- Phone numbers
- Names (first, last)
- Physical addresses
- External IDs
- Custom sensitive attributes

## Usage Examples

### Workspace-Restricted Setup

For a multi-tenant environment where you want to restrict access to specific workspaces:

```json
{
  "mcpServers": {
    "braze-production": {
      "command": "node",
      "args": ["/path/to/mcp-braze/dist/index.js"],
      "env": {
        "BRAZE_API_KEY": "production-api-key",
        "BRAZE_ALLOWED_WORKSPACES": "production",
        "BRAZE_ALLOWED_CAMPAIGN_TYPES": "email,push,sms",
        "BRAZE_READ_ONLY_MODE": "false"
      }
    },
    "braze-staging": {
      "command": "node",
      "args": ["/path/to/mcp-braze/dist/index.js"],
      "env": {
        "BRAZE_API_KEY": "staging-api-key",
        "BRAZE_ALLOWED_WORKSPACES": "staging",
        "BRAZE_ALLOWED_CAMPAIGN_TYPES": "*",
        "BRAZE_READ_ONLY_MODE": "false"
      }
    }
  }
}
```

### Analytics-Only Setup

For users who should only view analytics without modifying data:

```json
{
  "mcpServers": {
    "braze-analytics": {
      "command": "node",
      "args": ["/path/to/mcp-braze/dist/index.js"],
      "env": {
        "BRAZE_API_KEY": "analytics-api-key",
        "BRAZE_READ_ONLY_MODE": "true",
        "BRAZE_MASK_PII_FIELDS": "true"
      }
    }
  }
}
```

### Email-Only Marketing Setup

For teams that should only manage email campaigns:

```json
{
  "mcpServers": {
    "braze-email": {
      "command": "node",
      "args": ["/path/to/mcp-braze/dist/index.js"],
      "env": {
        "BRAZE_API_KEY": "email-team-api-key",
        "BRAZE_ALLOWED_CAMPAIGN_TYPES": "email",
        "BRAZE_ALLOWED_SEGMENTS": "email_subscribers,newsletter_users"
      }
    }
  }
}
```

## Access Control Errors

When access is denied, the server returns specific error messages:

### Workspace Access Denied
```json
{
  "error": "Access denied to workspace: production",
  "code": "ACCESS_DENIED",
  "details": {
    "workspace": "production"
  }
}
```

### Campaign Type Access Denied
```json
{
  "error": "Access denied to campaign type: sms",
  "code": "ACCESS_DENIED",
  "details": {
    "campaignType": "sms"
  }
}
```

### Read-Only Mode Violation
```json
{
  "error": "Operation not allowed in read-only mode",
  "code": "ACCESS_DENIED",
  "details": {
    "operation": "write"
  }
}
```

## Security Best Practices

### 1. Principle of Least Privilege

Always configure the minimum necessary permissions:

```bash
# Bad: Overly permissive
BRAZE_ALLOWED_WORKSPACES=*
BRAZE_ALLOWED_CAMPAIGN_TYPES=*
BRAZE_ALLOWED_SEGMENTS=*
BRAZE_READ_ONLY_MODE=false

# Good: Specific permissions
BRAZE_ALLOWED_WORKSPACES=production
BRAZE_ALLOWED_CAMPAIGN_TYPES=email
BRAZE_ALLOWED_SEGMENTS=verified_users,premium_users
BRAZE_READ_ONLY_MODE=false
```

### 2. Separate Environments

Use different configurations for different environments:

- **Development**: More permissive, test workspaces only
- **Staging**: Production-like restrictions
- **Production**: Strictest access controls

### 3. Regular Audits

Periodically review access configurations:

1. Check which workspaces are accessible
2. Verify campaign type restrictions
3. Review segment access lists
4. Audit user operations in logs

### 4. PII Protection

Always enable PII masking in production:

```bash
# Production configuration
BRAZE_MASK_PII_FIELDS=true
BRAZE_ENCRYPT_SENSITIVE_DATA=true
BRAZE_AUDIT_LOG_ENABLED=true
```

## Advanced Configuration

### Custom Access Rules

For complex scenarios, you can implement custom access rules by extending the `AccessController` class:

```typescript
class CustomAccessController extends AccessController {
  checkAccess(context: AccessContext): void {
    // Call parent implementation
    super.checkAccess(context);
    
    // Add custom rules
    if (context.operation === 'write' && isOutsideBusinessHours()) {
      throw new AccessControlError('Write operations not allowed outside business hours');
    }
  }
}
```

### Dynamic Access Control

For dynamic access control based on external systems:

```typescript
async checkDynamicAccess(userId: string, resource: string): Promise<boolean> {
  // Check with external authorization service
  const response = await authService.checkPermission(userId, resource);
  return response.allowed;
}
```

## Troubleshooting

### Common Issues

1. **"Access denied to workspace" error**
   - Check `BRAZE_ALLOWED_WORKSPACES` configuration
   - Verify workspace name matches exactly
   - Ensure workspace exists in Braze

2. **"Operation not allowed in read-only mode" error**
   - Check if `BRAZE_READ_ONLY_MODE` is set to `true`
   - Switch to `false` if write operations are needed

3. **PII fields showing as [MASKED]**
   - This is expected when `BRAZE_MASK_PII_FIELDS=true`
   - Set to `false` only if PII access is required and authorized

### Debug Mode

Enable debug logging to troubleshoot access control:

```bash
LOG_LEVEL=debug
```

This will log all access control checks and decisions.

## Compliance

The access control system helps with:

- **GDPR Compliance**: PII masking and data access restrictions
- **SOC2 Compliance**: Audit logging and access controls
- **HIPAA Compliance**: Field-level encryption and access restrictions
- **PCI Compliance**: Sensitive data protection

Always consult with your compliance team to ensure proper configuration.
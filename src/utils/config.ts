import { z } from 'zod';

const configSchema = z.object({
  braze: z.object({
    apiKey: z.string().min(1, 'BRAZE_API_KEY is required'),
    apiUrl: z.string().url('BRAZE_API_URL must be a valid URL'),
    appId: z.string().min(1, 'BRAZE_APP_ID is required'),
  }),
  accessControl: z.object({
    allowedWorkspaces: z.array(z.string()).default(['*']),
    allowedCampaignTypes: z.array(z.string()).default(['email', 'push', 'sms']),
    allowedSegments: z.array(z.string()).default(['*']),
    readOnlyMode: z.boolean().default(false),
    maskPiiFields: z.boolean().default(true),
  }),
  redis: z.object({
    url: z.string().optional(),
    cacheTtl: z.number().default(3600),
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number().default(1000),
    enableQueue: z.boolean().default(true),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }),
  security: z.object({
    encryptSensitiveData: z.boolean().default(true),
    auditLogEnabled: z.boolean().default(true),
  }),
});

export type Config = z.infer<typeof configSchema>;

function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return ['*'];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function loadConfig(): Config {
  const config = {
    braze: {
      apiKey: process.env.BRAZE_API_KEY || '',
      apiUrl: process.env.BRAZE_API_URL || '',
      appId: process.env.BRAZE_APP_ID || '',
    },
    accessControl: {
      allowedWorkspaces: parseCommaSeparated(process.env.BRAZE_ALLOWED_WORKSPACES),
      allowedCampaignTypes: parseCommaSeparated(process.env.BRAZE_ALLOWED_CAMPAIGN_TYPES),
      allowedSegments: parseCommaSeparated(process.env.BRAZE_ALLOWED_SEGMENTS),
      readOnlyMode: process.env.BRAZE_READ_ONLY_MODE === 'true',
      maskPiiFields: process.env.BRAZE_MASK_PII_FIELDS !== 'false',
    },
    redis: {
      url: process.env.REDIS_URL,
      cacheTtl: parseInt(process.env.REDIS_CACHE_TTL || '3600', 10),
    },
    rateLimit: {
      requestsPerMinute: parseInt(process.env.BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE || '1000', 10),
      enableQueue: process.env.BRAZE_ENABLE_QUEUE !== 'false',
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
      format: (process.env.LOG_FORMAT || 'json') as 'json' | 'pretty',
    },
    security: {
      encryptSensitiveData: process.env.BRAZE_ENCRYPT_SENSITIVE_DATA !== 'false',
      auditLogEnabled: process.env.BRAZE_AUDIT_LOG_ENABLED !== 'false',
    },
  };

  try {
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}
import winston from 'winston';
import { loadConfig } from './config.js';

const config = loadConfig();

const formats = {
  json: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  pretty: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta, null, 2)}`;
      }
      return log;
    })
  ),
};

export const logger = winston.createLogger({
  level: config.logging.level,
  format: formats[config.logging.format],
  transports: [
    new winston.transports.Console(),
  ],
});

const sensitiveFields = new Set([
  'api_key',
  'apiKey',
  'password',
  'email',
  'phone',
  'ssn',
  'credit_card',
  'external_id',
]);

export function sanitizeLogData(data: any): any {
  if (!config.security.encryptSensitiveData) {
    return data;
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.has(key) || key.toLowerCase().includes('secret')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logApiCall(method: string, endpoint: string, data?: any): void {
  if (config.security.auditLogEnabled) {
    logger.info('API Call', {
      method,
      endpoint,
      data: sanitizeLogData(data),
      timestamp: new Date().toISOString(),
    });
  }
}
/**
 * Logger utility for MCP server
 * Uses stderr for STDIO transport compatibility
 */

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

interface LogMetadata {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): string {
  const timestamp = new Date().toISOString();
  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function log(level: LogLevel, message: string, metadata?: LogMetadata): void {
  if (!shouldLog(level)) return;
  // Use stderr for STDIO transport compatibility
  console.error(formatMessage(level, message, metadata));
}

export const logger = {
  trace: (message: string, metadata?: LogMetadata) =>
    log("trace", message, metadata),

  debug: (message: string, metadata?: LogMetadata) =>
    log("debug", message, metadata),

  info: (message: string, metadata?: LogMetadata) =>
    log("info", message, metadata),

  warn: (message: string, metadata?: LogMetadata) =>
    log("warn", message, metadata),

  error: (message: string, error?: Error, metadata?: LogMetadata) => {
    const errorMeta: LogMetadata = {
      ...metadata,
      ...(error && {
        errorMessage: error.message,
        errorName: error.name,
        stack: error.stack,
      }),
    };
    log("error", message, errorMeta);
  },

  enter: (functionName: string, params?: LogMetadata) =>
    log("debug", `ENTER ${functionName}`, params),

  exit: (functionName: string, result?: LogMetadata) =>
    log("debug", `EXIT ${functionName}`, result),
};

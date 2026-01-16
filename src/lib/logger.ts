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

function isValidLogLevel(level: string | undefined): level is LogLevel {
  return level !== undefined && level in LOG_LEVELS;
}

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL;
  return isValidLogLevel(envLevel) ? envLevel : "info";
}

const currentLevel: LogLevel = getLogLevel();

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
  console.error(formatMessage(level, message, metadata));
}

function trace(message: string, metadata?: LogMetadata): void {
  log("trace", message, metadata);
}

function debug(message: string, metadata?: LogMetadata): void {
  log("debug", message, metadata);
}

function info(message: string, metadata?: LogMetadata): void {
  log("info", message, metadata);
}

function warn(message: string, metadata?: LogMetadata): void {
  log("warn", message, metadata);
}

function error(message: string, err?: Error, metadata?: LogMetadata): void {
  const errorMeta: LogMetadata = err
    ? {
        ...metadata,
        errorMessage: err.message,
        errorName: err.name,
        stack: err.stack,
      }
    : metadata ?? {};
  log("error", message, errorMeta);
}

function enter(functionName: string, params?: LogMetadata): void {
  log("debug", `ENTER ${functionName}`, params);
}

function exit(functionName: string, result?: LogMetadata): void {
  log("debug", `EXIT ${functionName}`, result);
}

export const logger = {
  trace,
  debug,
  info,
  warn,
  error,
  enter,
  exit,
};

/**
 * Authentication utilities for Braze API
 */

import { AuthenticationError } from "./errors.js";
import { logger } from "./logger.js";

interface SessionHeaders {
  [key: string]: string | string[] | undefined;
}

interface SessionContext {
  session?: {
    headers?: SessionHeaders;
  };
}

interface AuthArgs {
  apiKey?: string;
  restEndpoint?: string;
}

/**
 * Extract API key from multiple sources with priority:
 * 1. Tool parameter (explicit)
 * 2. HTTP headers via session (x-api-key or Authorization: Bearer)
 * 3. Environment variable
 */
export function extractApiKey(
  args: AuthArgs,
  context?: SessionContext
): string {
  // Priority 1: Tool parameter
  if (args.apiKey) {
    logger.debug("Using API key from tool parameter");
    return args.apiKey;
  }

  // Priority 2: HTTP headers via session
  const headers = context?.session?.headers;
  if (headers) {
    // Check x-api-key header
    const apiKeyHeader = headers["x-api-key"];
    if (apiKeyHeader) {
      const key = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
      if (key) {
        logger.debug("Using API key from x-api-key header");
        return key;
      }
    }

    // Check x-braze-api-key header (Braze-specific)
    const brazeApiKeyHeader = headers["x-braze-api-key"];
    if (brazeApiKeyHeader) {
      const key = Array.isArray(brazeApiKeyHeader)
        ? brazeApiKeyHeader[0]
        : brazeApiKeyHeader;
      if (key) {
        logger.debug("Using API key from x-braze-api-key header");
        return key;
      }
    }

    // Check Authorization header
    const authHeader = headers["authorization"];
    if (authHeader) {
      const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (auth?.startsWith("Bearer ")) {
        logger.debug("Using API key from Authorization header");
        return auth.substring(7);
      }
    }
  }

  // Priority 3: Environment variable
  if (process.env.BRAZE_API_KEY) {
    logger.debug("Using API key from environment variable");
    return process.env.BRAZE_API_KEY;
  }

  throw new AuthenticationError(
    "Braze API key is required. Provide via apiKey parameter, x-api-key/x-braze-api-key header, or BRAZE_API_KEY environment variable."
  );
}

/**
 * Extract REST endpoint from multiple sources with priority:
 * 1. Tool parameter (explicit)
 * 2. HTTP headers via session
 * 3. Environment variable
 * 4. Default (US-01)
 */
export function extractRestEndpoint(
  args: AuthArgs,
  context?: SessionContext
): string {
  // Priority 1: Tool parameter
  if (args.restEndpoint) {
    return normalizeEndpoint(args.restEndpoint);
  }

  // Priority 2: HTTP headers via session
  const headers = context?.session?.headers;
  if (headers) {
    const endpointHeader = headers["x-braze-rest-endpoint"];
    if (endpointHeader) {
      const endpoint = Array.isArray(endpointHeader)
        ? endpointHeader[0]
        : endpointHeader;
      if (endpoint) {
        return normalizeEndpoint(endpoint);
      }
    }
  }

  // Priority 3: Environment variable
  if (process.env.BRAZE_REST_ENDPOINT) {
    return normalizeEndpoint(process.env.BRAZE_REST_ENDPOINT);
  }

  // Priority 4: Default to US-01
  logger.debug("Using default REST endpoint (US-01)");
  return "https://rest.iad-01.braze.com";
}

/**
 * Normalize endpoint URL (remove trailing slash)
 */
function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

/**
 * Extract App ID from multiple sources
 */
export function extractAppId(
  args: { appId?: string },
  context?: SessionContext
): string | undefined {
  if (args.appId) {
    return args.appId;
  }

  const headers = context?.session?.headers;
  if (headers) {
    const appIdHeader = headers["x-braze-app-id"];
    if (appIdHeader) {
      return Array.isArray(appIdHeader) ? appIdHeader[0] : appIdHeader;
    }
  }

  return process.env.BRAZE_APP_ID;
}

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
 * Extract a single string value from a header that may be string, string[], or undefined.
 */
function getHeaderValue(
  headers: SessionHeaders,
  headerName: string
): string | undefined {
  const value = headers[headerName];
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract API key from multiple sources with priority:
 * 1. Tool parameter (explicit)
 * 2. HTTP headers via session (x-api-key, x-braze-api-key, or Authorization: Bearer)
 * 3. Environment variable
 */
export function extractApiKey(
  args: AuthArgs,
  context?: SessionContext
): string {
  if (args.apiKey) {
    logger.debug("Using API key from tool parameter");
    return args.apiKey;
  }

  const headers = context?.session?.headers;
  if (headers) {
    const apiKey = getHeaderValue(headers, "x-api-key");
    if (apiKey) {
      logger.debug("Using API key from x-api-key header");
      return apiKey;
    }

    const brazeApiKey = getHeaderValue(headers, "x-braze-api-key");
    if (brazeApiKey) {
      logger.debug("Using API key from x-braze-api-key header");
      return brazeApiKey;
    }

    const authHeader = getHeaderValue(headers, "authorization");
    if (authHeader?.startsWith("Bearer ")) {
      logger.debug("Using API key from Authorization header");
      return authHeader.substring(7);
    }
  }

  if (process.env.BRAZE_API_KEY) {
    logger.debug("Using API key from environment variable");
    return process.env.BRAZE_API_KEY;
  }

  throw new AuthenticationError(
    "Braze API key is required. Provide via apiKey parameter, x-api-key/x-braze-api-key header, or BRAZE_API_KEY environment variable."
  );
}

const DEFAULT_REST_ENDPOINT = "https://rest.iad-01.braze.com";

/**
 * Extract REST endpoint from multiple sources with priority:
 * 1. Tool parameter (explicit)
 * 2. HTTP headers via session (x-braze-rest-endpoint)
 * 3. Environment variable
 * 4. Default (US-01)
 */
export function extractRestEndpoint(
  args: AuthArgs,
  context?: SessionContext
): string {
  if (args.restEndpoint) {
    return normalizeEndpoint(args.restEndpoint);
  }

  const headers = context?.session?.headers;
  if (headers) {
    const endpoint = getHeaderValue(headers, "x-braze-rest-endpoint");
    if (endpoint) {
      return normalizeEndpoint(endpoint);
    }
  }

  if (process.env.BRAZE_REST_ENDPOINT) {
    return normalizeEndpoint(process.env.BRAZE_REST_ENDPOINT);
  }

  logger.debug("Using default REST endpoint (US-01)");
  return DEFAULT_REST_ENDPOINT;
}

/**
 * Normalize endpoint URL by removing trailing slashes.
 */
function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

/**
 * Input validation utilities for Braze MCP server
 */

import { z } from "zod";
import { ValidationError } from "./errors.js";

/**
 * Braze external_id validation
 * Must be a non-empty string, max 255 characters
 */
export const externalIdSchema = z
  .string()
  .min(1, "external_id cannot be empty")
  .max(255, "external_id cannot exceed 255 characters");

/**
 * Braze user alias schema
 */
export const userAliasSchema = z.object({
  alias_name: z.string().min(1).max(255),
  alias_label: z.string().min(1).max(255),
});

/**
 * Email validation
 */
export const emailSchema = z.string().email("Invalid email format");

/**
 * Phone number validation (E.164 format)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format (e.g., +14155551234)");

/**
 * ISO 8601 datetime validation
 * Matches formats like: 2024-01-15T10:30:00Z, 2024-01-15T10:30:00.123+05:00
 */
export const isoDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    "Must be ISO 8601 format"
  );

/**
 * Campaign/Canvas ID validation (alphanumeric with dashes)
 */
export const campaignIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid campaign/canvas ID format");

/**
 * Segment ID validation
 */
export const segmentIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid segment ID format");

/**
 * User attributes schema (partial, common fields)
 */
export const userAttributesSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    first_name: z.string().max(255).optional(),
    last_name: z.string().max(255).optional(),
    gender: z.enum(["M", "F", "O", "N", "P"]).optional(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD")
      .optional(),
    country: z.string().length(2).optional(),
    home_city: z.string().max(255).optional(),
    language: z.string().max(10).optional(),
    time_zone: z.string().max(255).optional(),
    email_subscribe: z.enum(["opted_in", "subscribed", "unsubscribed"]).optional(),
    push_subscribe: z.enum(["opted_in", "subscribed", "unsubscribed"]).optional(),
  })
  .passthrough(); // Allow custom attributes

/**
 * Custom event schema
 */
export const customEventSchema = z.object({
  name: z.string().min(1).max(255),
  time: isoDateTimeSchema,
  properties: z.record(z.unknown()).optional(),
  app_id: z.string().optional(),
});

/**
 * Purchase event schema
 */
export const purchaseEventSchema = z.object({
  product_id: z.string().min(1).max(255),
  currency: z.string().length(3, "Currency must be 3-letter ISO code"),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
  time: isoDateTimeSchema,
  properties: z.record(z.unknown()).optional(),
  app_id: z.string().optional(),
});

/**
 * Validate input and return typed result or throw ValidationError
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new ValidationError(
      `Validation failed: ${errors}`,
      fieldName
    );
  }
  return result.data;
}

/**
 * Sanitize string input (remove potential injection characters)
 */
export function sanitizeString(input: string): string {
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Validate batch size limits
 */
export function validateBatchSize(
  items: unknown[],
  maxSize: number,
  operation: string
): void {
  if (items.length > maxSize) {
    throw new ValidationError(
      `${operation} batch size exceeds maximum of ${maxSize}. Got ${items.length} items.`,
      "batch_size"
    );
  }
}

/**
 * Common batch limits for Braze API
 */
export const BATCH_LIMITS = {
  USERS_TRACK: 75, // Max users per /users/track request
  USERS_DELETE: 50, // Max users per /users/delete request
  MESSAGES_SEND: 50, // Max recipients per send
  EXPORT_IDS: 50, // Max IDs per export request
} as const;

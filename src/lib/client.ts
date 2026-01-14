/**
 * Braze API Client
 */

import {
  AuthenticationError,
  BrazeError,
  RateLimitError,
  NotFoundError,
  type ErrorContext,
} from "./errors.js";
import { logger } from "./logger.js";

export interface BrazeClientConfig {
  apiKey: string;
  restEndpoint: string;
}

export interface BrazeResponse<T = unknown> {
  message?: string;
  errors?: string[];
  [key: string]: T | string | string[] | undefined;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Record<string, unknown>;
  queryParams?: Record<string, string | number | boolean | undefined>;
  context?: ErrorContext;
}

export class BrazeClient {
  private readonly apiKey: string;
  private readonly restEndpoint: string;

  constructor(config: BrazeClientConfig) {
    this.apiKey = config.apiKey;
    this.restEndpoint = config.restEndpoint;
    logger.info("Braze client initialized", {
      endpoint: this.restEndpoint,
    });
  }

  /**
   * Make an authenticated request to the Braze API
   */
  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = "POST", body, queryParams, context } = options;

    logger.enter("BrazeClient.request", {
      endpoint,
      method,
      hasBody: !!body,
    });

    const url = this.buildUrl(endpoint, queryParams);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const data = (await response.json()) as BrazeResponse<T>;

      logger.debug("API response received", {
        status: response.status,
        endpoint,
      });

      if (!response.ok) {
        throw this.handleErrorResponse(response.status, data, context);
      }

      logger.exit("BrazeClient.request", { success: true });
      return data as T;
    } catch (error) {
      if (error instanceof BrazeError) {
        throw error;
      }

      logger.error("Request failed", error as Error, { endpoint, ...context });
      throw new BrazeError(
        `Request to ${endpoint} failed: ${(error as Error).message}`,
        "REQUEST_FAILED",
        undefined,
        context
      );
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(endpoint, this.restEndpoint);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Handle error responses from Braze API
   */
  private handleErrorResponse(
    status: number,
    data: BrazeResponse,
    context?: ErrorContext
  ): BrazeError {
    const message =
      data.message ||
      (Array.isArray(data.errors) ? data.errors.join(", ") : "Unknown error");

    switch (status) {
      case 401:
        return new AuthenticationError(
          `Authentication failed: ${message}`,
          context
        );
      case 404:
        return new NotFoundError(`Resource not found: ${message}`, context);
      case 429:
        return new RateLimitError(`Rate limit exceeded: ${message}`, undefined, context);
      default:
        return new BrazeError(
          `API error (${status}): ${message}`,
          "API_ERROR",
          status,
          context
        );
    }
  }

  // ========================================
  // User Data Endpoints
  // ========================================

  /**
   * Track user attributes, events, and purchases
   * POST /users/track
   */
  async usersTrack(params: {
    attributes?: UserAttributeObject[];
    events?: EventObject[];
    purchases?: PurchaseObject[];
  }): Promise<UsersTrackResponse> {
    return this.request<UsersTrackResponse>("/users/track", {
      body: params,
      context: { operation: "users_track" },
    });
  }

  /**
   * Identify users (merge alias-only profile with external_id)
   * POST /users/identify
   */
  async usersIdentify(params: {
    aliases_to_identify: AliasToIdentify[];
  }): Promise<BrazeResponse> {
    return this.request("/users/identify", {
      body: params,
      context: { operation: "users_identify" },
    });
  }

  /**
   * Create new user aliases
   * POST /users/alias/new
   */
  async usersAliasNew(params: {
    user_aliases: UserAliasNew[];
  }): Promise<BrazeResponse> {
    return this.request("/users/alias/new", {
      body: params,
      context: { operation: "users_alias_new" },
    });
  }

  /**
   * Delete users
   * POST /users/delete
   */
  async usersDelete(params: {
    external_ids?: string[];
    user_aliases?: UserAlias[];
    braze_ids?: string[];
  }): Promise<UsersDeleteResponse> {
    return this.request<UsersDeleteResponse>("/users/delete", {
      body: params,
      context: { operation: "users_delete" },
    });
  }

  /**
   * Merge users
   * POST /users/merge
   */
  async usersMerge(params: {
    merge_updates: MergeUpdate[];
  }): Promise<BrazeResponse> {
    return this.request("/users/merge", {
      body: params,
      context: { operation: "users_merge" },
    });
  }

  // ========================================
  // Messaging Endpoints
  // ========================================

  /**
   * Send messages immediately
   * POST /messages/send
   */
  async messagesSend(params: MessagesSendParams): Promise<MessagesSendResponse> {
    return this.request<MessagesSendResponse>("/messages/send", {
      body: params as unknown as Record<string, unknown>,
      context: { operation: "messages_send" },
    });
  }

  /**
   * Schedule messages
   * POST /messages/schedule/create
   */
  async messagesScheduleCreate(
    params: MessagesScheduleParams
  ): Promise<ScheduleResponse> {
    return this.request<ScheduleResponse>("/messages/schedule/create", {
      body: params as unknown as Record<string, unknown>,
      context: { operation: "messages_schedule_create" },
    });
  }

  /**
   * Delete scheduled messages
   * POST /messages/schedule/delete
   */
  async messagesScheduleDelete(params: {
    schedule_id: string;
  }): Promise<BrazeResponse> {
    return this.request("/messages/schedule/delete", {
      body: params,
      context: { operation: "messages_schedule_delete" },
    });
  }

  /**
   * Trigger API-triggered campaign
   * POST /campaigns/trigger/send
   */
  async campaignsTriggerSend(
    params: CampaignTriggerParams
  ): Promise<CampaignSendResponse> {
    return this.request<CampaignSendResponse>("/campaigns/trigger/send", {
      body: params as unknown as Record<string, unknown>,
      context: { operation: "campaigns_trigger_send" },
    });
  }

  /**
   * Trigger API-triggered Canvas
   * POST /canvas/trigger/send
   */
  async canvasTriggerSend(
    params: CanvasTriggerParams
  ): Promise<CanvasSendResponse> {
    return this.request<CanvasSendResponse>("/canvas/trigger/send", {
      body: params as unknown as Record<string, unknown>,
      context: { operation: "canvas_trigger_send" },
    });
  }

  // ========================================
  // Export Endpoints
  // ========================================

  /**
   * Export user profiles by IDs
   * POST /users/export/ids
   */
  async usersExportIds(params: {
    external_ids?: string[];
    user_aliases?: UserAlias[];
    braze_ids?: string[];
    fields_to_export?: string[];
  }): Promise<UsersExportResponse> {
    return this.request<UsersExportResponse>("/users/export/ids", {
      body: params,
      context: { operation: "users_export_ids" },
    });
  }

  /**
   * Export campaign analytics
   * GET /campaigns/data_series
   */
  async campaignsDataSeries(params: {
    campaign_id: string;
    length: number;
    ending_at?: string;
  }): Promise<CampaignDataResponse> {
    return this.request<CampaignDataResponse>("/campaigns/data_series", {
      method: "GET",
      queryParams: params,
      context: { operation: "campaigns_data_series" },
    });
  }

  /**
   * List campaigns
   * GET /campaigns/list
   */
  async campaignsList(params?: {
    page?: number;
    include_archived?: boolean;
    sort_direction?: "asc" | "desc";
    last_edit_time_gt?: string;
  }): Promise<CampaignsListResponse> {
    return this.request<CampaignsListResponse>("/campaigns/list", {
      method: "GET",
      queryParams: params as Record<string, string | number | boolean>,
      context: { operation: "campaigns_list" },
    });
  }

  /**
   * Get campaign details
   * GET /campaigns/details
   */
  async campaignsDetails(params: {
    campaign_id: string;
  }): Promise<CampaignDetailsResponse> {
    return this.request<CampaignDetailsResponse>("/campaigns/details", {
      method: "GET",
      queryParams: params,
      context: { operation: "campaigns_details" },
    });
  }

  /**
   * List segments
   * GET /segments/list
   */
  async segmentsList(params?: {
    page?: number;
    sort_direction?: "asc" | "desc";
  }): Promise<SegmentsListResponse> {
    return this.request<SegmentsListResponse>("/segments/list", {
      method: "GET",
      queryParams: params as Record<string, string | number | boolean>,
      context: { operation: "segments_list" },
    });
  }

  /**
   * Get segment analytics
   * GET /segments/data_series
   */
  async segmentsDataSeries(params: {
    segment_id: string;
    length: number;
    ending_at?: string;
  }): Promise<SegmentDataResponse> {
    return this.request<SegmentDataResponse>("/segments/data_series", {
      method: "GET",
      queryParams: params,
      context: { operation: "segments_data_series" },
    });
  }

  /**
   * Export KPI data (DAU, MAU, etc.)
   * GET /kpi/mau/data_series
   */
  async kpiMauDataSeries(params: {
    length: number;
    ending_at?: string;
    app_id?: string;
  }): Promise<KpiDataResponse> {
    return this.request<KpiDataResponse>("/kpi/mau/data_series", {
      method: "GET",
      queryParams: params,
      context: { operation: "kpi_mau_data_series" },
    });
  }

  /**
   * GET /kpi/dau/data_series
   */
  async kpiDauDataSeries(params: {
    length: number;
    ending_at?: string;
    app_id?: string;
  }): Promise<KpiDataResponse> {
    return this.request<KpiDataResponse>("/kpi/dau/data_series", {
      method: "GET",
      queryParams: params,
      context: { operation: "kpi_dau_data_series" },
    });
  }
}

// ========================================
// Type Definitions
// ========================================

export interface UserAlias {
  alias_name: string;
  alias_label: string;
}

export interface UserAliasNew {
  external_id?: string;
  alias_name: string;
  alias_label: string;
}

export interface AliasToIdentify {
  external_id: string;
  user_alias: UserAlias;
}

export interface MergeUpdate {
  identifier_to_merge: {
    external_id?: string;
    user_alias?: UserAlias;
  };
  identifier_to_keep: {
    external_id?: string;
    user_alias?: UserAlias;
  };
}

export interface UserAttributeObject {
  external_id?: string;
  user_alias?: UserAlias;
  braze_id?: string;
  [key: string]: unknown;
}

export interface EventObject {
  external_id?: string;
  user_alias?: UserAlias;
  braze_id?: string;
  app_id?: string;
  name: string;
  time: string;
  properties?: Record<string, unknown>;
}

export interface PurchaseObject {
  external_id?: string;
  user_alias?: UserAlias;
  braze_id?: string;
  app_id?: string;
  product_id: string;
  currency: string;
  price: number;
  quantity?: number;
  time: string;
  properties?: Record<string, unknown>;
}

export interface UsersTrackResponse extends BrazeResponse {
  attributes_processed?: number;
  events_processed?: number;
  purchases_processed?: number;
}

export interface UsersDeleteResponse extends BrazeResponse {
  deleted: number;
}

export interface UsersExportResponse extends BrazeResponse {
  users: UserProfile[];
  invalid_user_ids?: string[];
}

export interface UserProfile {
  external_id?: string;
  user_aliases?: UserAlias[];
  braze_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: unknown;
}

export interface MessagesSendParams {
  broadcast?: boolean;
  external_user_ids?: string[];
  user_aliases?: UserAlias[];
  segment_id?: string;
  audience?: AudienceObject;
  campaign_id?: string;
  send_id?: string;
  override_frequency_capping?: boolean;
  recipient_subscription_state?: string;
  messages?: MessagesObject;
}

export interface AudienceObject {
  AND?: AudienceFilter[];
  OR?: AudienceFilter[];
}

export interface AudienceFilter {
  custom_attribute?: { custom_attribute_name: string; value: unknown };
  push_subscription_status?: string;
  email_subscription_status?: string;
  [key: string]: unknown;
}

export interface MessagesObject {
  apple_push?: ApplePushObject;
  android_push?: AndroidPushObject;
  email?: EmailObject;
  webhook?: WebhookObject;
  content_card?: ContentCardObject;
  [key: string]: unknown;
}

export interface ApplePushObject {
  alert?: string | { title?: string; body?: string };
  badge?: number;
  sound?: string;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AndroidPushObject {
  alert?: string;
  title?: string;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EmailObject {
  app_id?: string;
  subject?: string;
  from?: string;
  reply_to?: string;
  body?: string;
  plaintext_body?: string;
  preheader?: string;
  email_template_id?: string;
  [key: string]: unknown;
}

export interface WebhookObject {
  url: string;
  request_content_type?: string;
  body?: string;
  [key: string]: unknown;
}

export interface ContentCardObject {
  title?: string;
  description?: string;
  image_url?: string;
  url?: string;
  [key: string]: unknown;
}

export interface MessagesSendResponse extends BrazeResponse {
  dispatch_id?: string;
}

export interface MessagesScheduleParams {
  broadcast?: boolean;
  external_user_ids?: string[];
  user_aliases?: UserAlias[];
  segment_id?: string;
  audience?: AudienceObject;
  campaign_id?: string;
  send_id?: string;
  schedule: ScheduleObject;
  messages?: MessagesObject;
}

export interface ScheduleObject {
  time: string;
  in_local_time?: boolean;
  at_optimal_time?: boolean;
}

export interface ScheduleResponse extends BrazeResponse {
  dispatch_id?: string;
  schedule_id?: string;
}

export interface CampaignTriggerParams {
  campaign_id: string;
  send_id?: string;
  trigger_properties?: Record<string, unknown>;
  broadcast?: boolean;
  audience?: AudienceObject;
  recipients?: RecipientObject[];
}

export interface CanvasTriggerParams {
  canvas_id: string;
  canvas_entry_properties?: Record<string, unknown>;
  broadcast?: boolean;
  audience?: AudienceObject;
  recipients?: RecipientObject[];
}

export interface RecipientObject {
  external_user_id?: string;
  user_alias?: UserAlias;
  trigger_properties?: Record<string, unknown>;
  canvas_entry_properties?: Record<string, unknown>;
  send_to_existing_only?: boolean;
  attributes?: Record<string, unknown>;
}

export interface CampaignSendResponse extends BrazeResponse {
  dispatch_id?: string;
}

export interface CanvasSendResponse extends BrazeResponse {
  dispatch_id?: string;
}

export interface CampaignDataResponse extends BrazeResponse {
  data: CampaignDataPoint[];
}

export interface CampaignDataPoint {
  time: string;
  messages?: Record<string, MessageStats>;
  [key: string]: unknown;
}

export interface MessageStats {
  sent?: number;
  direct_opens?: number;
  total_opens?: number;
  bounces?: number;
  [key: string]: unknown;
}

export interface CampaignsListResponse extends BrazeResponse {
  campaigns: CampaignSummary[];
}

export interface CampaignSummary {
  id: string;
  name: string;
  last_edited: string;
  is_api_campaign?: boolean;
  tags?: string[];
}

export interface CampaignDetailsResponse extends BrazeResponse {
  name?: string;
  created_at?: string;
  updated_at?: string;
  archived?: boolean;
  draft?: boolean;
  schedule_type?: string;
  channels?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface SegmentsListResponse extends BrazeResponse {
  segments: SegmentSummary[];
}

export interface SegmentSummary {
  id: string;
  name: string;
  analytics_tracking_enabled: boolean;
  tags?: string[];
}

export interface SegmentDataResponse extends BrazeResponse {
  data: SegmentDataPoint[];
}

export interface SegmentDataPoint {
  time: string;
  size: number;
}

export interface KpiDataResponse extends BrazeResponse {
  data: KpiDataPoint[];
}

export interface KpiDataPoint {
  time: string;
  mau?: number;
  dau?: number;
  [key: string]: unknown;
}

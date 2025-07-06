import axios, { AxiosInstance, AxiosError } from 'axios';
import PQueue from 'p-queue';
import { Redis } from 'ioredis';
import { Config } from '../utils/config.js';
import { logger, logApiCall } from '../utils/logger.js';
import { ApiError, RateLimitError, ValidationError } from '../utils/errors.js';
import { AccessController } from '../utils/access-control.js';
import type {
  BrazeCampaign,
  BrazeUser,
  BrazeSegment,
  BrazeContentBlock,
  BrazeTemplate,
  BrazeCampaignAnalytics,
  BrazeKpiMetrics,
  BrazeApiResponse,
  BrazeCampaignTriggerRequest,
  BrazeUserTrackRequest,
  BrazeSegmentDefinition,
} from './types.js';

export class BrazeClient {
  private axios: AxiosInstance;
  private queue: PQueue;
  private redis?: Redis;
  private accessController: AccessController;

  constructor(private config: Config) {
    this.axios = axios.create({
      baseURL: config.braze.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.braze.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.queue = new PQueue({
      concurrency: 10,
      interval: 60000, // 1 minute
      intervalCap: config.rateLimit.requestsPerMinute,
    });

    if (config.redis.url) {
      this.redis = new Redis(config.redis.url);
    }

    this.accessController = new AccessController(config);

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config) => {
        logApiCall(config.method?.toUpperCase() || 'GET', config.url || '', config.data);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 429) {
            const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
            throw new RateLimitError('Braze API rate limit exceeded', retryAfter);
          }
          
          if (status >= 400 && status < 500) {
            const message = (data as any)?.message || error.message;
            throw new ValidationError(message, data);
          }
          
          if (status >= 500) {
            throw new ApiError('Braze API server error', status, data);
          }
        }
        
        throw error;
      }
    );
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: any
  ): Promise<T> {
    if (this.config.rateLimit.enableQueue) {
      return this.queue.add(async () => {
        const response = await this.axios.request<T>({
          method,
          url: endpoint,
          data,
          params,
        });
        return response.data;
      }) as Promise<T>;
    }

    const response = await this.axios.request<T>({
      method,
      url: endpoint,
      data,
      params,
    });
    return response.data;
  }

  private async getCached<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        logger.debug('Cache hit', { key });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.error('Cache error', error);
    }
    
    return null;
  }

  private async setCached(key: string, value: any): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, this.config.redis.cacheTtl, JSON.stringify(value));
      logger.debug('Cache set', { key });
    } catch (error) {
      logger.error('Cache error', error);
    }
  }

  // Campaign Management
  async listCampaigns(options?: {
    page?: number;
    include_archived?: boolean;
    sort_direction?: 'asc' | 'desc';
  }): Promise<BrazeCampaign[]> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ campaigns: BrazeCampaign[] }>>(
      'GET',
      '/campaigns/list',
      null,
      options
    );
    
    const campaigns = response.campaigns || [];
    return this.accessController.filterAllowedCampaigns(campaigns);
  }

  async getCampaign(campaignId: string): Promise<BrazeCampaign> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const cacheKey = `campaign:${campaignId}`;
    const cached = await this.getCached<BrazeCampaign>(cacheKey);
    if (cached) return cached;
    
    const response = await this.request<BrazeApiResponse<{ campaign: BrazeCampaign }>>(
      'GET',
      `/campaigns/details`,
      null,
      { campaign_id: campaignId }
    );
    
    const campaign = response.campaign;
    if (!campaign) {
      throw new ValidationError('Campaign not found');
    }
    
    this.accessController.checkAccess({
      operation: 'read',
      campaignType: campaign.type,
    });
    
    await this.setCached(cacheKey, campaign);
    return campaign;
  }

  async createCampaign(campaign: Partial<BrazeCampaign>): Promise<{ campaign_id: string }> {
    this.accessController.checkAccess({
      operation: 'write',
      campaignType: campaign.type,
    });
    
    const response = await this.request<BrazeApiResponse<{ campaign_id: string }>>(
      'POST',
      '/campaigns/create',
      campaign
    );
    
    return { campaign_id: response.campaign_id };
  }

  async updateCampaign(campaignId: string, updates: Partial<BrazeCampaign>): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    
    this.accessController.checkAccess({
      operation: 'write',
      campaignType: campaign.type,
    });
    
    await this.request('POST', '/campaigns/update', {
      campaign_id: campaignId,
      ...updates,
    });
    
    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`campaign:${campaignId}`);
    }
  }

  async scheduleCampaign(
    campaignId: string,
    schedule: { time: string; timezone?: string }
  ): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    
    this.accessController.checkAccess({
      operation: 'write',
      campaignType: campaign.type,
    });
    
    await this.request('POST', '/campaigns/trigger/schedule/create', {
      campaign_id: campaignId,
      schedule,
    });
  }

  async sendCampaign(request: BrazeCampaignTriggerRequest): Promise<void> {
    const campaign = await this.getCampaign(request.campaign_id);
    
    this.accessController.checkAccess({
      operation: 'write',
      campaignType: campaign.type,
    });
    
    await this.request('POST', '/campaigns/trigger/send', request);
  }

  // User Management
  async trackUser(request: BrazeUserTrackRequest): Promise<void> {
    this.accessController.checkAccess({ operation: 'write' });
    
    // Mask PII if configured
    if (request.attributes && this.config.accessControl.maskPiiFields) {
      request.attributes = request.attributes.map(user => 
        this.accessController.maskPiiFields(user)
      );
    }
    
    await this.request('POST', '/users/track', request);
  }

  async getUserProfile(userId: string, options?: {
    id_type?: 'external_id' | 'user_alias' | 'braze_id';
  }): Promise<BrazeUser> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const cacheKey = `user:${userId}`;
    const cached = await this.getCached<BrazeUser>(cacheKey);
    if (cached) return cached;
    
    const response = await this.request<BrazeApiResponse<{ users: BrazeUser[] }>>(
      'POST',
      '/users/export/ids',
      {
        [options?.id_type || 'external_id']: [userId],
        fields_to_export: ['all'],
      }
    );
    
    const user = response.users?.[0];
    if (!user) {
      throw new ValidationError('User not found');
    }
    
    const maskedUser = this.accessController.maskPiiFields(user);
    await this.setCached(cacheKey, maskedUser);
    return maskedUser;
  }

  async updateUserAttributes(
    userId: string,
    attributes: Partial<BrazeUser>
  ): Promise<void> {
    this.accessController.checkAccess({ operation: 'write' });
    
    await this.trackUser({
      attributes: [{
        external_id: userId,
        ...attributes,
      }],
    });
    
    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`user:${userId}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.accessController.checkAccess({ operation: 'delete' });
    
    await this.request('POST', '/users/delete', {
      external_ids: [userId],
    });
    
    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`user:${userId}`);
    }
  }

  async exportUsers(segmentId?: string, options?: {
    callback_endpoint?: string;
    fields_to_export?: string[];
  }): Promise<{ export_id: string }> {
    this.accessController.checkAccess({
      operation: 'read',
      segment: segmentId,
    });
    
    const response = await this.request<BrazeApiResponse<{ export_id: string }>>(
      'POST',
      '/users/export/segment',
      {
        segment_id: segmentId,
        ...options,
      }
    );
    
    return { export_id: response.export_id };
  }

  // Segmentation
  async listSegments(options?: {
    page?: number;
    sort_direction?: 'asc' | 'desc';
  }): Promise<BrazeSegment[]> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ segments: BrazeSegment[] }>>(
      'GET',
      '/segments/list',
      null,
      options
    );
    
    const segments = response.segments || [];
    return this.accessController.filterAllowedSegments(segments);
  }

  async createSegment(segment: BrazeSegmentDefinition): Promise<{ segment_id: string }> {
    this.accessController.checkAccess({ operation: 'write' });
    
    const response = await this.request<BrazeApiResponse<{ segment_id: string }>>(
      'POST',
      '/segments/create',
      segment
    );
    
    return { segment_id: response.segment_id };
  }

  async getSegmentAnalytics(segmentId: string): Promise<{
    size: number;
    last_computed: string;
  }> {
    this.accessController.checkAccess({
      operation: 'read',
      segment: segmentId,
    });
    
    const response = await this.request<BrazeApiResponse<{ data: any }>>(
      'GET',
      '/segments/data_series',
      null,
      {
        segment_id: segmentId,
        length: 1,
        ending_at: new Date().toISOString(),
      }
    );
    
    return {
      size: response.data?.size || 0,
      last_computed: new Date().toISOString(),
    };
  }

  async updateSegment(
    segmentId: string,
    updates: Partial<BrazeSegmentDefinition>
  ): Promise<void> {
    this.accessController.checkAccess({
      operation: 'write',
      segment: segmentId,
    });
    
    await this.request('POST', '/segments/update', {
      segment_id: segmentId,
      ...updates,
    });
  }

  // Content Management
  async listContentBlocks(options?: {
    page?: number;
    include_inclusion_data?: boolean;
  }): Promise<BrazeContentBlock[]> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ content_blocks: BrazeContentBlock[] }>>(
      'GET',
      '/content_blocks/list',
      null,
      options
    );
    
    return response.content_blocks || [];
  }

  async createContentBlock(contentBlock: {
    name: string;
    description?: string;
    content: string;
    content_type: 'html' | 'text';
    tags?: string[];
  }): Promise<{ content_block_id: string }> {
    this.accessController.checkAccess({ operation: 'write' });
    
    const response = await this.request<BrazeApiResponse<{ content_block_id: string }>>(
      'POST',
      '/content_blocks/create',
      contentBlock
    );
    
    return { content_block_id: response.content_block_id };
  }

  async updateContentBlock(
    contentBlockId: string,
    updates: Partial<BrazeContentBlock>
  ): Promise<void> {
    this.accessController.checkAccess({ operation: 'write' });
    
    await this.request('POST', '/content_blocks/update', {
      content_block_id: contentBlockId,
      ...updates,
    });
  }

  async listTemplates(options?: {
    page?: number;
    include_archived?: boolean;
  }): Promise<BrazeTemplate[]> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ templates: BrazeTemplate[] }>>(
      'GET',
      '/templates/email/list',
      null,
      options
    );
    
    return response.templates || [];
  }

  // Analytics & Reporting
  async getCampaignAnalytics(
    campaignId: string,
    options?: {
      length?: number;
      ending_at?: string;
    }
  ): Promise<BrazeCampaignAnalytics> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ data: any }>>(
      'GET',
      '/campaigns/data_series',
      null,
      {
        campaign_id: campaignId,
        length: options?.length || 7,
        ending_at: options?.ending_at || new Date().toISOString(),
      }
    );
    
    return {
      campaign_id: campaignId,
      campaign_name: response.data?.name || '',
      messages_sent: response.data?.messages_sent || 0,
      messages_delivered: response.data?.messages_delivered || 0,
      messages_opened: response.data?.messages_opened || 0,
      messages_clicked: response.data?.messages_clicked || 0,
      conversions: response.data?.conversions || 0,
      revenue: response.data?.revenue || 0,
      bounces: response.data?.bounces || 0,
      unsubscribes: response.data?.unsubscribes || 0,
      spam_reports: response.data?.spam_reports || 0,
    };
  }

  async getKpiMetrics(options: {
    length?: number;
    ending_at?: string;
    kpi?: 'dau' | 'mau' | 'new_users' | 'sessions' | 'revenue' | 'purchases';
  }): Promise<BrazeKpiMetrics[]> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ data: any[] }>>(
      'GET',
      '/kpi/dau/data_series',
      null,
      {
        length: options.length || 7,
        ending_at: options.ending_at || new Date().toISOString(),
        app_id: this.config.braze.appId,
      }
    );
    
    return response.data || [];
  }

  async exportAnalytics(options: {
    export_type: 'campaigns' | 'canvases' | 'segments';
    start_date: string;
    end_date: string;
    callback_endpoint?: string;
  }): Promise<{ export_id: string }> {
    this.accessController.checkAccess({ operation: 'read' });
    
    const response = await this.request<BrazeApiResponse<{ export_id: string }>>(
      'POST',
      `/export/${options.export_type}`,
      options
    );
    
    return { export_id: response.export_id };
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
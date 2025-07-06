import { z } from 'zod';
import { BrazeClient } from '../braze/client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Tool schemas
const listCampaignsSchema = z.object({
  page: z.number().optional(),
  include_archived: z.boolean().optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
});

const getCampaignSchema = z.object({
  campaign_id: z.string(),
});

const createCampaignSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['email', 'push', 'sms', 'webhook', 'in_app_message']),
  segments: z.array(z.string()).optional(),
  message: z.object({
    subject: z.string().optional(),
    body: z.string().optional(),
    from: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

const updateCampaignSchema = z.object({
  campaign_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const scheduleCampaignSchema = z.object({
  campaign_id: z.string(),
  time: z.string(),
  timezone: z.string().optional(),
});

const sendCampaignSchema = z.object({
  campaign_id: z.string(),
  recipients: z.array(z.object({
    external_user_id: z.string().optional(),
    user_alias: z.object({
      alias_name: z.string(),
      alias_label: z.string(),
    }).optional(),
    trigger_properties: z.record(z.any()).optional(),
  })).optional(),
  broadcast: z.boolean().optional(),
});

const trackUserSchema = z.object({
  attributes: z.array(z.object({
    external_id: z.string().optional(),
    user_alias: z.object({
      alias_name: z.string(),
      alias_label: z.string(),
    }).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    custom_attributes: z.record(z.any()).optional(),
  })).optional(),
  events: z.array(z.object({
    external_id: z.string().optional(),
    user_alias: z.object({
      alias_name: z.string(),
      alias_label: z.string(),
    }).optional(),
    name: z.string(),
    time: z.string(),
    properties: z.record(z.any()).optional(),
  })).optional(),
  purchases: z.array(z.object({
    external_id: z.string().optional(),
    user_alias: z.object({
      alias_name: z.string(),
      alias_label: z.string(),
    }).optional(),
    product_id: z.string(),
    currency: z.string(),
    price: z.number(),
    quantity: z.number().optional(),
    time: z.string(),
    properties: z.record(z.any()).optional(),
  })).optional(),
});

const getUserProfileSchema = z.object({
  user_id: z.string(),
  id_type: z.enum(['external_id', 'user_alias', 'braze_id']).optional(),
});

const updateUserAttributesSchema = z.object({
  user_id: z.string(),
  attributes: z.record(z.any()),
});

const deleteUserSchema = z.object({
  user_id: z.string(),
});

const exportUsersSchema = z.object({
  segment_id: z.string().optional(),
  callback_endpoint: z.string().url().optional(),
  fields_to_export: z.array(z.string()).optional(),
});

const listSegmentsSchema = z.object({
  page: z.number().optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
});

const createSegmentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  filters: z.array(z.object({
    AND: z.array(z.object({
      attribute_name: z.string(),
      comparison: z.enum([
        'equals', 'not_equal', 'greater_than', 'less_than',
        'exists', 'does_not_exist', 'contains', 'does_not_contain'
      ]),
      value: z.any().optional(),
    })).optional(),
    OR: z.array(z.object({
      attribute_name: z.string(),
      comparison: z.enum([
        'equals', 'not_equal', 'greater_than', 'less_than',
        'exists', 'does_not_exist', 'contains', 'does_not_contain'
      ]),
      value: z.any().optional(),
    })).optional(),
  })),
  tags: z.array(z.string()).optional(),
});

const getSegmentAnalyticsSchema = z.object({
  segment_id: z.string(),
});

const updateSegmentSchema = z.object({
  segment_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  filters: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

const listContentBlocksSchema = z.object({
  page: z.number().optional(),
  include_inclusion_data: z.boolean().optional(),
});

const createContentBlockSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string(),
  content_type: z.enum(['html', 'text']),
  tags: z.array(z.string()).optional(),
});

const updateContentBlockSchema = z.object({
  content_block_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const listTemplatesSchema = z.object({
  page: z.number().optional(),
  include_archived: z.boolean().optional(),
});

const getCampaignAnalyticsSchema = z.object({
  campaign_id: z.string(),
  length: z.number().optional(),
  ending_at: z.string().optional(),
});

const getKpiMetricsSchema = z.object({
  kpi: z.enum(['dau', 'mau', 'new_users', 'sessions', 'revenue', 'purchases']).optional(),
  length: z.number().optional(),
  ending_at: z.string().optional(),
});

const exportAnalyticsSchema = z.object({
  export_type: z.enum(['campaigns', 'canvases', 'segments']),
  start_date: z.string(),
  end_date: z.string(),
  callback_endpoint: z.string().url().optional(),
});

export function createToolHandlers(client: BrazeClient) {
  return {
    // Campaign Management
    async list_campaigns(args: unknown) {
      try {
        const params = listCampaignsSchema.parse(args);
        const campaigns = await client.listCampaigns(params);
        return { campaigns };
      } catch (error) {
        logger.error('Error listing campaigns', error);
        throw formatErrorForMcp(error);
      }
    },

    async get_campaign(args: unknown) {
      try {
        const { campaign_id } = getCampaignSchema.parse(args);
        const campaign = await client.getCampaign(campaign_id);
        return { campaign };
      } catch (error) {
        logger.error('Error getting campaign', error);
        throw formatErrorForMcp(error);
      }
    },

    async create_campaign(args: unknown) {
      try {
        const params = createCampaignSchema.parse(args);
        const result = await client.createCampaign(params);
        return result;
      } catch (error) {
        logger.error('Error creating campaign', error);
        throw formatErrorForMcp(error);
      }
    },

    async update_campaign(args: unknown) {
      try {
        const { campaign_id, ...updates } = updateCampaignSchema.parse(args);
        await client.updateCampaign(campaign_id, updates);
        return { success: true };
      } catch (error) {
        logger.error('Error updating campaign', error);
        throw formatErrorForMcp(error);
      }
    },

    async schedule_campaign(args: unknown) {
      try {
        const { campaign_id, ...schedule } = scheduleCampaignSchema.parse(args);
        await client.scheduleCampaign(campaign_id, schedule);
        return { success: true };
      } catch (error) {
        logger.error('Error scheduling campaign', error);
        throw formatErrorForMcp(error);
      }
    },

    async send_campaign(args: unknown) {
      try {
        const params = sendCampaignSchema.parse(args);
        await client.sendCampaign(params);
        return { success: true };
      } catch (error) {
        logger.error('Error sending campaign', error);
        throw formatErrorForMcp(error);
      }
    },

    // User Management
    async track_user(args: unknown) {
      try {
        const params = trackUserSchema.parse(args);
        await client.trackUser(params);
        return { success: true };
      } catch (error) {
        logger.error('Error tracking user', error);
        throw formatErrorForMcp(error);
      }
    },

    async get_user_profile(args: unknown) {
      try {
        const { user_id, id_type } = getUserProfileSchema.parse(args);
        const user = await client.getUserProfile(user_id, { id_type });
        return { user };
      } catch (error) {
        logger.error('Error getting user profile', error);
        throw formatErrorForMcp(error);
      }
    },

    async update_user_attributes(args: unknown) {
      try {
        const { user_id, attributes } = updateUserAttributesSchema.parse(args);
        await client.updateUserAttributes(user_id, attributes);
        return { success: true };
      } catch (error) {
        logger.error('Error updating user attributes', error);
        throw formatErrorForMcp(error);
      }
    },

    async delete_user(args: unknown) {
      try {
        const { user_id } = deleteUserSchema.parse(args);
        await client.deleteUser(user_id);
        return { success: true };
      } catch (error) {
        logger.error('Error deleting user', error);
        throw formatErrorForMcp(error);
      }
    },

    async export_users(args: unknown) {
      try {
        const params = exportUsersSchema.parse(args);
        const result = await client.exportUsers(params.segment_id, params);
        return result;
      } catch (error) {
        logger.error('Error exporting users', error);
        throw formatErrorForMcp(error);
      }
    },

    // Segmentation
    async list_segments(args: unknown) {
      try {
        const params = listSegmentsSchema.parse(args);
        const segments = await client.listSegments(params);
        return { segments };
      } catch (error) {
        logger.error('Error listing segments', error);
        throw formatErrorForMcp(error);
      }
    },

    async create_segment(args: unknown) {
      try {
        const params = createSegmentSchema.parse(args);
        const result = await client.createSegment(params);
        return result;
      } catch (error) {
        logger.error('Error creating segment', error);
        throw formatErrorForMcp(error);
      }
    },

    async get_segment_analytics(args: unknown) {
      try {
        const { segment_id } = getSegmentAnalyticsSchema.parse(args);
        const analytics = await client.getSegmentAnalytics(segment_id);
        return { analytics };
      } catch (error) {
        logger.error('Error getting segment analytics', error);
        throw formatErrorForMcp(error);
      }
    },

    async update_segment(args: unknown) {
      try {
        const { segment_id, ...updates } = updateSegmentSchema.parse(args);
        await client.updateSegment(segment_id, updates);
        return { success: true };
      } catch (error) {
        logger.error('Error updating segment', error);
        throw formatErrorForMcp(error);
      }
    },

    // Content Management
    async list_content_blocks(args: unknown) {
      try {
        const params = listContentBlocksSchema.parse(args);
        const content_blocks = await client.listContentBlocks(params);
        return { content_blocks };
      } catch (error) {
        logger.error('Error listing content blocks', error);
        throw formatErrorForMcp(error);
      }
    },

    async create_content_block(args: unknown) {
      try {
        const params = createContentBlockSchema.parse(args);
        const result = await client.createContentBlock(params);
        return result;
      } catch (error) {
        logger.error('Error creating content block', error);
        throw formatErrorForMcp(error);
      }
    },

    async update_content_block(args: unknown) {
      try {
        const { content_block_id, ...updates } = updateContentBlockSchema.parse(args);
        await client.updateContentBlock(content_block_id, updates);
        return { success: true };
      } catch (error) {
        logger.error('Error updating content block', error);
        throw formatErrorForMcp(error);
      }
    },

    async list_templates(args: unknown) {
      try {
        const params = listTemplatesSchema.parse(args);
        const templates = await client.listTemplates(params);
        return { templates };
      } catch (error) {
        logger.error('Error listing templates', error);
        throw formatErrorForMcp(error);
      }
    },

    // Analytics & Reporting
    async get_campaign_analytics(args: unknown) {
      try {
        const params = getCampaignAnalyticsSchema.parse(args);
        const analytics = await client.getCampaignAnalytics(
          params.campaign_id,
          params
        );
        return { analytics };
      } catch (error) {
        logger.error('Error getting campaign analytics', error);
        throw formatErrorForMcp(error);
      }
    },

    async get_kpi_metrics(args: unknown) {
      try {
        const params = getKpiMetricsSchema.parse(args);
        const metrics = await client.getKpiMetrics(params);
        return { metrics };
      } catch (error) {
        logger.error('Error getting KPI metrics', error);
        throw formatErrorForMcp(error);
      }
    },

    async export_analytics(args: unknown) {
      try {
        const params = exportAnalyticsSchema.parse(args);
        const result = await client.exportAnalytics(params);
        return result;
      } catch (error) {
        logger.error('Error exporting analytics', error);
        throw formatErrorForMcp(error);
      }
    },
  };
}

export const toolDefinitions = [
  // Campaign Management
  {
    name: 'list_campaigns',
    description: 'List all campaigns with optional filtering',
    inputSchema: listCampaignsSchema,
  },
  {
    name: 'get_campaign',
    description: 'Get detailed information about a specific campaign',
    inputSchema: getCampaignSchema,
  },
  {
    name: 'create_campaign',
    description: 'Create a new email, push, or SMS campaign',
    inputSchema: createCampaignSchema,
  },
  {
    name: 'update_campaign',
    description: 'Update an existing campaign',
    inputSchema: updateCampaignSchema,
  },
  {
    name: 'schedule_campaign',
    description: 'Schedule a campaign for future delivery',
    inputSchema: scheduleCampaignSchema,
  },
  {
    name: 'send_campaign',
    description: 'Trigger immediate sending of a campaign',
    inputSchema: sendCampaignSchema,
  },
  // User Management
  {
    name: 'track_user',
    description: 'Track user attributes, events, and purchases',
    inputSchema: trackUserSchema,
  },
  {
    name: 'get_user_profile',
    description: 'Retrieve a user profile by ID',
    inputSchema: getUserProfileSchema,
  },
  {
    name: 'update_user_attributes',
    description: 'Update user attributes',
    inputSchema: updateUserAttributesSchema,
  },
  {
    name: 'delete_user',
    description: 'Delete user data (GDPR compliance)',
    inputSchema: deleteUserSchema,
  },
  {
    name: 'export_users',
    description: 'Export user data from a segment',
    inputSchema: exportUsersSchema,
  },
  // Segmentation
  {
    name: 'list_segments',
    description: 'List all user segments',
    inputSchema: listSegmentsSchema,
  },
  {
    name: 'create_segment',
    description: 'Create a new user segment with filters',
    inputSchema: createSegmentSchema,
  },
  {
    name: 'get_segment_analytics',
    description: 'Get segment size and analytics',
    inputSchema: getSegmentAnalyticsSchema,
  },
  {
    name: 'update_segment',
    description: 'Update segment filters and properties',
    inputSchema: updateSegmentSchema,
  },
  // Content Management
  {
    name: 'list_content_blocks',
    description: 'List reusable content blocks',
    inputSchema: listContentBlocksSchema,
  },
  {
    name: 'create_content_block',
    description: 'Create a new HTML or text content block',
    inputSchema: createContentBlockSchema,
  },
  {
    name: 'update_content_block',
    description: 'Update an existing content block',
    inputSchema: updateContentBlockSchema,
  },
  {
    name: 'list_templates',
    description: 'List email and push notification templates',
    inputSchema: listTemplatesSchema,
  },
  // Analytics & Reporting
  {
    name: 'get_campaign_analytics',
    description: 'Get campaign performance metrics',
    inputSchema: getCampaignAnalyticsSchema,
  },
  {
    name: 'get_kpi_metrics',
    description: 'Get KPI metrics like DAU, MAU, revenue, etc.',
    inputSchema: getKpiMetricsSchema,
  },
  {
    name: 'export_analytics',
    description: 'Export analytics data for campaigns, canvases, or segments',
    inputSchema: exportAnalyticsSchema,
  },
];
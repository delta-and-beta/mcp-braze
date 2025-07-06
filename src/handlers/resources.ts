import { BrazeClient } from '../braze/client.js';
import { logger } from '../utils/logger.js';

export function createResourceHandlers(client: BrazeClient) {
  return {
    async listResources() {
      try {
        const [campaigns, segments, contentBlocks, templates] = await Promise.all([
          client.listCampaigns({ page: 1 }).catch(() => []),
          client.listSegments({ page: 1 }).catch(() => []),
          client.listContentBlocks({ page: 1 }).catch(() => []),
          client.listTemplates({ page: 1 }).catch(() => []),
        ]);

        const resources = [
          ...campaigns.map(campaign => ({
            uri: `braze://campaigns/${campaign.id}`,
            name: campaign.name,
            description: campaign.description || `${campaign.type} campaign`,
            mimeType: 'application/json',
          })),
          ...segments.map(segment => ({
            uri: `braze://segments/${segment.id}`,
            name: segment.name,
            description: segment.description || 'User segment',
            mimeType: 'application/json',
          })),
          ...contentBlocks.map(block => ({
            uri: `braze://content-blocks/${block.content_block_id}`,
            name: block.name,
            description: block.description || `${block.content_type} content block`,
            mimeType: block.content_type === 'html' ? 'text/html' : 'text/plain',
          })),
          ...templates.map(template => ({
            uri: `braze://templates/${template.template_id}`,
            name: template.template_name,
            description: 'Email template',
            mimeType: 'text/html',
          })),
        ];

        return { resources };
      } catch (error) {
        logger.error('Error listing resources', error);
        return { resources: [] };
      }
    },

    async readResource(uri: string) {
      try {
        const url = new URL(uri);
        const [, resourceType, resourceId] = url.pathname.split('/');

        switch (resourceType) {
          case 'campaigns': {
            const campaign = await client.getCampaign(resourceId);
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(campaign, null, 2),
                },
              ],
            };
          }

          case 'segments': {
            const [segments, analytics] = await Promise.all([
              client.listSegments(),
              client.getSegmentAnalytics(resourceId).catch(() => null),
            ]);
            
            const segment = segments.find(s => s.id === resourceId);
            if (!segment) {
              throw new Error('Segment not found');
            }

            const data = {
              ...segment,
              analytics,
            };

            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'content-blocks': {
            const blocks = await client.listContentBlocks({ include_inclusion_data: true });
            const block = blocks.find(b => b.content_block_id === resourceId);
            
            if (!block) {
              throw new Error('Content block not found');
            }

            return {
              contents: [
                {
                  uri,
                  mimeType: block.content_type === 'html' ? 'text/html' : 'text/plain',
                  text: block.content,
                },
              ],
            };
          }

          case 'templates': {
            const templates = await client.listTemplates();
            const template = templates.find(t => t.template_id === resourceId);
            
            if (!template) {
              throw new Error('Template not found');
            }

            return {
              contents: [
                {
                  uri,
                  mimeType: 'text/html',
                  text: template.body || '',
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown resource type: ${resourceType}`);
        }
      } catch (error) {
        logger.error('Error reading resource', { uri, error });
        throw error;
      }
    },
  };
}
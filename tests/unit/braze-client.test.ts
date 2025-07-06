import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { BrazeClient } from '../../src/braze/client';
import { loadConfig } from '../../src/utils/config';
import { mockApiResponse, mockApiError } from '../setup';

vi.mock('axios');

describe('BrazeClient', () => {
  let client: BrazeClient;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      create: vi.fn().mockReturnThis(),
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    (axios.create as any).mockReturnValue(mockAxios);
    
    const config = loadConfig();
    client = new BrazeClient(config);
  });

  describe('listCampaigns', () => {
    it('should list campaigns successfully', async () => {
      const mockCampaigns = [
        { id: '1', name: 'Campaign 1', type: 'email' },
        { id: '2', name: 'Campaign 2', type: 'push' },
      ];

      mockAxios.request.mockResolvedValue(
        mockApiResponse({ campaigns: mockCampaigns })
      );

      const result = await client.listCampaigns();
      expect(result).toEqual(mockCampaigns);
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/campaigns/list',
        data: null,
        params: undefined,
      });
    });

    it('should handle rate limit errors', async () => {
      mockAxios.request.mockRejectedValue(
        mockApiError(429, 'Rate limit exceeded')
      );

      await expect(client.listCampaigns()).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('trackUser', () => {
    it('should track user attributes', async () => {
      const userData = {
        attributes: [{
          external_id: 'user123',
          email: 'test@example.com',
          custom_attributes: { tier: 'premium' },
        }],
      };

      mockAxios.request.mockResolvedValue(mockApiResponse({ success: true }));

      await client.trackUser(userData);
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/users/track',
        data: userData,
        params: undefined,
      });
    });

    it('should mask PII fields when configured', async () => {
      const userData = {
        attributes: [{
          external_id: 'user123',
          email: 'test@example.com',
          phone: '+1234567890',
        }],
      };

      mockAxios.request.mockResolvedValue(mockApiResponse({ success: true }));

      await client.trackUser(userData);
      
      // Check that PII masking was applied
      const calledData = mockAxios.request.mock.calls[0][0].data;
      expect(calledData.attributes[0].email).toBe('[MASKED]');
      expect(calledData.attributes[0].phone).toBe('[MASKED]');
    });
  });

  describe('createSegment', () => {
    it('should create a segment with filters', async () => {
      const segmentData = {
        name: 'High Value Users',
        description: 'Users with high lifetime value',
        filters: [{
          AND: [
            {
              attribute_name: 'lifetime_value',
              comparison: 'greater_than' as const,
              value: 100,
            },
          ],
        }],
      };

      mockAxios.request.mockResolvedValue(
        mockApiResponse({ segment_id: 'seg123' })
      );

      const result = await client.createSegment(segmentData);
      expect(result).toEqual({ segment_id: 'seg123' });
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/segments/create',
        data: segmentData,
        params: undefined,
      });
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should retrieve campaign analytics', async () => {
      const mockAnalytics = {
        messages_sent: 1000,
        messages_delivered: 950,
        messages_opened: 300,
        messages_clicked: 100,
      };

      mockAxios.request.mockResolvedValue(
        mockApiResponse({ data: mockAnalytics })
      );

      const result = await client.getCampaignAnalytics('campaign123');
      expect(result).toMatchObject({
        campaign_id: 'campaign123',
        messages_sent: 1000,
        messages_delivered: 950,
      });
    });
  });
});
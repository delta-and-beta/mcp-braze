import { describe, it, expect, beforeEach } from 'vitest';
import { AccessController } from '../../src/utils/access-control';
import { AccessControlError } from '../../src/utils/errors';
import { loadConfig } from '../../src/utils/config';

describe('AccessController', () => {
  let accessController: AccessController;
  let config: any;

  beforeEach(() => {
    config = {
      accessControl: {
        allowedWorkspaces: ['workspace1', 'workspace2'],
        allowedCampaignTypes: ['email', 'push'],
        allowedSegments: ['segment1', 'segment2'],
        readOnlyMode: false,
        maskPiiFields: true,
      },
    };
    accessController = new AccessController(config);
  });

  describe('checkAccess', () => {
    it('should allow read operations in read-only mode', () => {
      config.accessControl.readOnlyMode = true;
      accessController = new AccessController(config);

      expect(() => {
        accessController.checkAccess({ operation: 'read' });
      }).not.toThrow();
    });

    it('should deny write operations in read-only mode', () => {
      config.accessControl.readOnlyMode = true;
      accessController = new AccessController(config);

      expect(() => {
        accessController.checkAccess({ operation: 'write' });
      }).toThrow(AccessControlError);
    });

    it('should allow access to permitted workspaces', () => {
      expect(() => {
        accessController.checkAccess({
          operation: 'read',
          workspace: 'workspace1',
        });
      }).not.toThrow();
    });

    it('should deny access to non-permitted workspaces', () => {
      expect(() => {
        accessController.checkAccess({
          operation: 'read',
          workspace: 'workspace3',
        });
      }).toThrow('Access denied to workspace: workspace3');
    });

    it('should allow all workspaces when configured with *', () => {
      config.accessControl.allowedWorkspaces = ['*'];
      accessController = new AccessController(config);

      expect(() => {
        accessController.checkAccess({
          operation: 'read',
          workspace: 'any-workspace',
        });
      }).not.toThrow();
    });

    it('should check campaign type restrictions', () => {
      expect(() => {
        accessController.checkAccess({
          operation: 'write',
          campaignType: 'sms',
        });
      }).toThrow('Access denied to campaign type: sms');
    });

    it('should check segment restrictions', () => {
      expect(() => {
        accessController.checkAccess({
          operation: 'read',
          segment: 'segment3',
        });
      }).toThrow('Access denied to segment: segment3');
    });
  });

  describe('maskPiiFields', () => {
    it('should mask PII fields when enabled', () => {
      const data = {
        external_id: 'user123',
        email: 'test@example.com',
        phone: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
        custom_field: 'value',
      };

      const masked = accessController.maskPiiFields(data);

      expect(masked.external_id).toBe('[MASKED]');
      expect(masked.email).toBe('[MASKED]');
      expect(masked.phone).toBe('[MASKED]');
      expect(masked.first_name).toBe('[MASKED]');
      expect(masked.last_name).toBe('[MASKED]');
      expect(masked.custom_field).toBe('value');
    });

    it('should not mask fields when disabled', () => {
      config.accessControl.maskPiiFields = false;
      accessController = new AccessController(config);

      const data = {
        email: 'test@example.com',
        phone: '+1234567890',
      };

      const result = accessController.maskPiiFields(data);
      expect(result).toEqual(data);
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
          profile: {
            phone: '+1234567890',
          },
        },
      };

      const masked = accessController.maskPiiFields(data);
      expect(masked.user.email).toBe('[MASKED]');
      expect(masked.user.profile.phone).toBe('[MASKED]');
    });
  });

  describe('filterAllowedCampaigns', () => {
    it('should filter campaigns by allowed types', () => {
      const campaigns = [
        { id: '1', name: 'Email Campaign', type: 'email' },
        { id: '2', name: 'SMS Campaign', type: 'sms' },
        { id: '3', name: 'Push Campaign', type: 'push' },
      ];

      const filtered = accessController.filterAllowedCampaigns(campaigns);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.type)).toEqual(['email', 'push']);
    });

    it('should return all campaigns when * is allowed', () => {
      config.accessControl.allowedCampaignTypes = ['*'];
      accessController = new AccessController(config);

      const campaigns = [
        { id: '1', type: 'email' },
        { id: '2', type: 'sms' },
        { id: '3', type: 'webhook' },
      ];

      const filtered = accessController.filterAllowedCampaigns(campaigns);
      expect(filtered).toEqual(campaigns);
    });
  });

  describe('filterAllowedSegments', () => {
    it('should filter segments by allowed IDs', () => {
      const segments = [
        { id: 'segment1', name: 'Segment 1' },
        { id: 'segment2', name: 'Segment 2' },
        { id: 'segment3', name: 'Segment 3' },
      ];

      const filtered = accessController.filterAllowedSegments(segments);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(s => s.id)).toEqual(['segment1', 'segment2']);
    });

    it('should handle segment_id field', () => {
      const segments = [
        { segment_id: 'segment1', name: 'Segment 1' },
        { segment_id: 'segment3', name: 'Segment 3' },
      ];

      const filtered = accessController.filterAllowedSegments(segments);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].segment_id).toBe('segment1');
    });
  });
});
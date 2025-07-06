import { Config } from './config.js';
import { AccessControlError } from './errors.js';
import { logger } from './logger.js';

export interface AccessContext {
  workspace?: string;
  campaignType?: string;
  segment?: string;
  operation: 'read' | 'write' | 'delete';
}

export class AccessController {
  constructor(private config: Config) {}

  checkAccess(context: AccessContext): void {
    logger.debug('Checking access', context);

    // Check read-only mode
    if (this.config.accessControl.readOnlyMode && context.operation !== 'read') {
      throw new AccessControlError(
        'Operation not allowed in read-only mode',
        { operation: context.operation }
      );
    }

    // Check workspace access
    if (context.workspace && !this.isWorkspaceAllowed(context.workspace)) {
      throw new AccessControlError(
        `Access denied to workspace: ${context.workspace}`,
        { workspace: context.workspace }
      );
    }

    // Check campaign type access
    if (context.campaignType && !this.isCampaignTypeAllowed(context.campaignType)) {
      throw new AccessControlError(
        `Access denied to campaign type: ${context.campaignType}`,
        { campaignType: context.campaignType }
      );
    }

    // Check segment access
    if (context.segment && !this.isSegmentAllowed(context.segment)) {
      throw new AccessControlError(
        `Access denied to segment: ${context.segment}`,
        { segment: context.segment }
      );
    }
  }

  private isWorkspaceAllowed(workspace: string): boolean {
    const allowed = this.config.accessControl.allowedWorkspaces;
    return allowed.includes('*') || allowed.includes(workspace);
  }

  private isCampaignTypeAllowed(campaignType: string): boolean {
    const allowed = this.config.accessControl.allowedCampaignTypes;
    return allowed.includes('*') || allowed.includes(campaignType);
  }

  private isSegmentAllowed(segment: string): boolean {
    const allowed = this.config.accessControl.allowedSegments;
    return allowed.includes('*') || allowed.includes(segment);
  }

  maskPiiFields<T extends Record<string, any>>(data: T): T {
    if (!this.config.accessControl.maskPiiFields) {
      return data;
    }

    const piiFields = new Set([
      'email',
      'phone',
      'phone_number',
      'first_name',
      'last_name',
      'address',
      'ssn',
      'credit_card',
      'external_id',
      'user_alias',
    ]);

    const masked = { ...data };
    
    for (const key of Object.keys(masked)) {
      if (piiFields.has(key.toLowerCase())) {
        masked[key] = '[MASKED]';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskPiiFields(masked[key]);
      }
    }

    return masked;
  }

  filterAllowedCampaigns(campaigns: any[]): any[] {
    if (this.config.accessControl.allowedCampaignTypes.includes('*')) {
      return campaigns;
    }

    return campaigns.filter(campaign => 
      this.config.accessControl.allowedCampaignTypes.includes(campaign.type || campaign.campaign_type)
    );
  }

  filterAllowedSegments(segments: any[]): any[] {
    if (this.config.accessControl.allowedSegments.includes('*')) {
      return segments;
    }

    return segments.filter(segment => 
      this.config.accessControl.allowedSegments.includes(segment.id || segment.segment_id)
    );
  }
}
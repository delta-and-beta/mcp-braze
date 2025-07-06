export interface BrazeCampaign {
  id: string;
  name: string;
  description?: string;
  type: 'email' | 'push' | 'sms' | 'webhook' | 'in_app_message';
  status: 'draft' | 'active' | 'paused' | 'archived' | 'scheduled';
  created_at: string;
  updated_at: string;
  schedule?: {
    time: string;
    timezone: string;
  };
  segments?: string[];
  message_variation_id?: string;
  tags?: string[];
}

export interface BrazeUser {
  external_id?: string;
  user_alias?: {
    alias_name: string;
    alias_label: string;
  };
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  country?: string;
  language?: string;
  timezone?: string;
  custom_attributes?: Record<string, any>;
  custom_events?: BrazeEvent[];
  purchases?: BrazePurchase[];
  push_tokens?: Array<{
    app_id: string;
    token: string;
    device_id?: string;
  }>;
}

export interface BrazeEvent {
  name: string;
  time: string;
  properties?: Record<string, any>;
}

export interface BrazePurchase {
  product_id: string;
  currency: string;
  price: number;
  quantity?: number;
  time: string;
  properties?: Record<string, any>;
}

export interface BrazeSegment {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  analytics?: {
    size: number;
    last_computed: string;
  };
}

export interface BrazeContentBlock {
  content_block_id: string;
  name: string;
  description?: string;
  content: string;
  content_type: 'html' | 'text';
  tags?: string[];
  created_at: string;
  updated_at: string;
  inclusion_count?: number;
}

export interface BrazeTemplate {
  template_id: string;
  template_name: string;
  subject?: string;
  preheader?: string;
  body?: string;
  plaintext_body?: string;
  should_inline_css?: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface BrazeCampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  messages_sent?: number;
  messages_delivered?: number;
  messages_opened?: number;
  messages_clicked?: number;
  conversions?: number;
  revenue?: number;
  bounces?: number;
  unsubscribes?: number;
  spam_reports?: number;
}

export interface BrazeKpiMetrics {
  date: string;
  dau?: number; // Daily Active Users
  mau?: number; // Monthly Active Users
  new_users?: number;
  sessions?: number;
  revenue?: number;
  purchases?: number;
  custom_events?: Record<string, number>;
}

export interface BrazeApiResponse<T> {
  message?: string;
  errors?: string[];
  [key: string]: any;
}

export interface BrazeCampaignTriggerRequest {
  campaign_id: string;
  recipients?: Array<{
    external_user_id?: string;
    user_alias?: {
      alias_name: string;
      alias_label: string;
    };
    trigger_properties?: Record<string, any>;
  }>;
  audience?: {
    AND?: Array<Record<string, any>>;
    OR?: Array<Record<string, any>>;
  };
  broadcast?: boolean;
}

export interface BrazeUserTrackRequest {
  attributes?: BrazeUser[];
  events?: Array<{
    external_id?: string;
    user_alias?: {
      alias_name: string;
      alias_label: string;
    };
    name: string;
    time: string;
    properties?: Record<string, any>;
  }>;
  purchases?: Array<{
    external_id?: string;
    user_alias?: {
      alias_name: string;
      alias_label: string;
    };
    product_id: string;
    currency: string;
    price: number;
    quantity?: number;
    time: string;
    properties?: Record<string, any>;
  }>;
}

export interface BrazeSegmentFilter {
  attribute_name: string;
  comparison: 'equals' | 'not_equal' | 'greater_than' | 'less_than' | 'exists' | 'does_not_exist' | 'contains' | 'does_not_contain';
  value?: any;
}

export interface BrazeSegmentDefinition {
  name: string;
  description?: string;
  filters: Array<{
    AND?: BrazeSegmentFilter[];
    OR?: BrazeSegmentFilter[];
  }>;
  tags?: string[];
}
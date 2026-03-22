-- White-label and reseller system tables

CREATE TABLE IF NOT EXISTS revenue_operator.white_label_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  brand_name text,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#3B82F6',
  secondary_color text DEFAULT '#10B981',
  accent_color text DEFAULT '#F59E0B',
  custom_domain text,
  support_email text,
  support_url text,
  powered_by_hidden boolean DEFAULT false,
  custom_css text,
  login_background_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.reseller_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  child_workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active',
  monthly_calls_limit integer,
  monthly_leads_limit integer,
  custom_limits jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.reseller_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  month text NOT NULL,
  total_calls integer DEFAULT 0,
  total_leads integer DEFAULT 0,
  total_revenue numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, month)
);

CREATE INDEX IF NOT EXISTS idx_white_label_config_workspace_id ON revenue_operator.white_label_config(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reseller_relationships_parent ON revenue_operator.reseller_relationships(parent_workspace_id);
CREATE INDEX IF NOT EXISTS idx_reseller_relationships_child ON revenue_operator.reseller_relationships(child_workspace_id);
CREATE INDEX IF NOT EXISTS idx_reseller_analytics_workspace ON revenue_operator.reseller_analytics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reseller_analytics_month ON revenue_operator.reseller_analytics(month);

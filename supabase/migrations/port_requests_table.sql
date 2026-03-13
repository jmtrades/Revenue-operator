CREATE TABLE IF NOT EXISTS revenue_operator.port_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id),
  phone_number text NOT NULL,
  current_carrier text NOT NULL,
  account_number text,
  account_pin text,
  loa_url text,
  contact_name text,
  contact_email text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE revenue_operator.port_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY port_requests_workspace ON revenue_operator.port_requests
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM revenue_operator.workspace_roles WHERE user_id = auth.uid()
  ));


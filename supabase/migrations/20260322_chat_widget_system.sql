-- Live Chat Widget System
-- Stores widget configuration, chat sessions, and messages
BEGIN;

-- Widget configuration per workspace
CREATE TABLE IF NOT EXISTS revenue_operator.chat_widget_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  accent_color text DEFAULT '#3b82f6',
  position text DEFAULT 'bottom-right',
  greeting_message text DEFAULT 'Hi! How can we help you today?',
  agent_name text DEFAULT 'Support Agent',
  avatar_url text,
  auto_open_delay integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat sessions with visitors
CREATE TABLE IF NOT EXISTS revenue_operator.chat_widget_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  visitor_email text,
  session_token text NOT NULL UNIQUE,
  status text DEFAULT 'active',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_widget_sessions_workspace_id ON revenue_operator.chat_widget_sessions(workspace_id, status);
CREATE INDEX IF NOT EXISTS chat_widget_sessions_created_at ON revenue_operator.chat_widget_sessions(created_at DESC);

-- Chat messages
CREATE TABLE IF NOT EXISTS revenue_operator.chat_widget_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES revenue_operator.chat_widget_sessions(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  sender_type text NOT NULL,
  sender_name text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_widget_messages_session_id ON revenue_operator.chat_widget_messages(session_id, created_at ASC);

COMMIT;

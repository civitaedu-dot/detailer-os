ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS excluded_client_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_client_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS selected_client_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_campaigns_user_draft ON public.campaigns (user_id, is_draft);
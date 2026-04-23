
-- ============ EXTEND EXISTING TABLES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_balance numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS credits_total_purchased numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_total_used numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plivo_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS plivo_call_uuid text,
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS from_number text,
  ADD COLUMN IF NOT EXISTS to_number text,
  ADD COLUMN IF NOT EXISTS campaign_id uuid;

CREATE INDEX IF NOT EXISTS idx_agents_slug ON public.agents(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_plivo_uuid ON public.calls(plivo_call_uuid) WHERE plivo_call_uuid IS NOT NULL;

-- ============ PLIVO CREDENTIALS ============
CREATE TABLE public.plivo_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  auth_id text NOT NULL,
  auth_token_encrypted text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plivo_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plivo creds" ON public.plivo_credentials FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view plivo creds" ON public.plivo_credentials FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_plivo_creds_updated BEFORE UPDATE ON public.plivo_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PHONE NUMBERS ============
CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  number text NOT NULL,
  country text,
  type text NOT NULL DEFAULT 'local',
  monthly_rent numeric DEFAULT 0,
  capabilities jsonb DEFAULT '{"voice": true, "sms": false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'imported',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, number)
);
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own numbers" ON public.phone_numbers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all numbers" ON public.phone_numbers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_phone_numbers_user ON public.phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_number ON public.phone_numbers(number);
CREATE TRIGGER update_phone_numbers_updated BEFORE UPDATE ON public.phone_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  from_number text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_contacts integer NOT NULL DEFAULT 0,
  completed_contacts integer NOT NULL DEFAULT 0,
  failed_contacts integer NOT NULL DEFAULT 0,
  concurrency integer NOT NULL DEFAULT 3,
  retry_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns" ON public.campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all campaigns" ON public.campaigns FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status IN ('scheduled', 'queued');
CREATE TRIGGER update_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAMPAIGN CONTACTS ============
CREATE TABLE public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  variables jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  call_id uuid,
  last_error text,
  called_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contacts" ON public.campaign_contacts FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins view all contacts" ON public.campaign_contacts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_campaign_contacts_campaign ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON public.campaign_contacts(campaign_id, status);

-- ============ SCHEDULED CALLS ============
CREATE TABLE public.scheduled_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  from_number text NOT NULL,
  to_number text NOT NULL,
  contact_name text,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  call_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scheduled" ON public.scheduled_calls FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all scheduled" ON public.scheduled_calls FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_scheduled_calls_pending ON public.scheduled_calls(scheduled_for) WHERE status = 'scheduled';
CREATE TRIGGER update_scheduled_calls_updated BEFORE UPDATE ON public.scheduled_calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CREDITS LEDGER ============
CREATE TABLE public.credits_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  type text NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ledger" ON public.credits_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all ledger" ON public.credits_ledger FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert ledger" ON public.credits_ledger FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_credits_ledger_user ON public.credits_ledger(user_id, created_at DESC);

-- ============ AGENT PAGES (public share pages) ============
CREATE TABLE public.agent_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  visibility text NOT NULL DEFAULT 'private',
  title text NOT NULL DEFAULT 'Talk to our AI agent',
  subtitle text,
  hero_text text,
  cta_label text NOT NULL DEFAULT 'Talk now',
  primary_color text NOT NULL DEFAULT '#7c3aed',
  accent_color text NOT NULL DEFAULT '#06b6d4',
  background_style text NOT NULL DEFAULT 'gradient',
  logo_url text,
  cover_image_url text,
  features jsonb DEFAULT '[]'::jsonb,
  faqs jsonb DEFAULT '[]'::jsonb,
  allow_browser_call boolean NOT NULL DEFAULT true,
  allow_phone_callback boolean NOT NULL DEFAULT true,
  collect_email boolean NOT NULL DEFAULT false,
  custom_domain text,
  view_count integer NOT NULL DEFAULT 0,
  call_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pages" ON public.agent_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all pages" ON public.agent_pages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view published pages" ON public.agent_pages FOR SELECT TO anon, authenticated USING (visibility = 'public');
CREATE INDEX idx_agent_pages_slug ON public.agent_pages(slug);
CREATE TRIGGER update_agent_pages_updated BEFORE UPDATE ON public.agent_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAGE LEADS ============
CREATE TABLE public.page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_page_id uuid NOT NULL REFERENCES public.agent_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  name text,
  email text,
  phone text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new',
  call_id uuid,
  source_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.page_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own leads" ON public.page_leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON public.page_leads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all leads" ON public.page_leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can submit leads to public pages" ON public.page_leads FOR INSERT TO anon, authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_pages p WHERE p.id = agent_page_id AND p.visibility = 'public'));
CREATE INDEX idx_page_leads_user ON public.page_leads(user_id, created_at DESC);

-- ============ CALL RECORDINGS ============
CREATE TABLE public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recording_url text NOT NULL,
  duration_seconds integer DEFAULT 0,
  format text DEFAULT 'mp3',
  size_bytes bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own recordings" ON public.call_recordings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recordings" ON public.call_recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all recordings" ON public.call_recordings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============ HELPER FUNCTIONS ============

-- Atomically deduct/add credits and write ledger entry
CREATE OR REPLACE FUNCTION public.adjust_credits(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_description text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE public.profiles
  SET 
    credits_balance = credits_balance + p_amount,
    credits_total_purchased = credits_total_purchased + GREATEST(p_amount, 0),
    credits_total_used = credits_total_used + GREATEST(-p_amount, 0)
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'profile not found for user %', p_user_id;
  END IF;

  INSERT INTO public.credits_ledger(user_id, amount, balance_after, type, description, reference_id, reference_type)
  VALUES (p_user_id, p_amount, v_new_balance, p_type, p_description, p_reference_id, p_reference_type);

  RETURN v_new_balance;
END; $$;

-- Generate a unique slug for an agent page
CREATE OR REPLACE FUNCTION public.generate_agent_slug(p_base text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_candidate text;
  v_n int := 0;
BEGIN
  v_slug := lower(regexp_replace(coalesce(p_base, 'agent'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN v_slug := 'agent'; END IF;
  v_candidate := v_slug;
  WHILE EXISTS (SELECT 1 FROM public.agent_pages WHERE slug = v_candidate) LOOP
    v_n := v_n + 1;
    v_candidate := v_slug || '-' || v_n;
  END LOOP;
  RETURN v_candidate;
END; $$;

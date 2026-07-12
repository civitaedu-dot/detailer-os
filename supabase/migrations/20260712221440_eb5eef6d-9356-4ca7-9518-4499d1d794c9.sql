
-- Enums
CREATE TYPE public.cash_account_type AS ENUM ('dinheiro','banco','pix','maquininha','outro');
CREATE TYPE public.cash_direction AS ENUM ('in','out');
CREATE TYPE public.cash_source AS ENUM ('import','manual','auto_appointment','auto_fixed_cost','auto_variable_cost');
CREATE TYPE public.reconciliation_status AS ENUM ('pending','matched','divergent','needs_review','ignored');
CREATE TYPE public.import_file_format AS ENUM ('csv','xlsx','ofx','pdf');
CREATE TYPE public.import_status AS ENUM ('processing','completed','failed');

-- cash_accounts
CREATE TABLE public.cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.cash_account_type NOT NULL DEFAULT 'banco',
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  initial_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  color TEXT DEFAULT '#22C55E',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_accounts TO authenticated;
GRANT ALL ON public.cash_accounts TO service_role;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash_accounts" ON public.cash_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cash_accounts_updated BEFORE UPDATE ON public.cash_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bank_imports
CREATE TABLE public.bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_format public.import_file_format NOT NULL,
  period_start DATE,
  period_end DATE,
  total_rows INTEGER NOT NULL DEFAULT 0,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  pending_rows INTEGER NOT NULL DEFAULT 0,
  status public.import_status NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_imports TO authenticated;
GRANT ALL ON public.bank_imports TO service_role;
ALTER TABLE public.bank_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank_imports" ON public.bank_imports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bank_imports_updated BEFORE UPDATE ON public.bank_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cash_transactions
CREATE TABLE public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(14,2) NOT NULL,
  direction public.cash_direction NOT NULL,
  category TEXT,
  payment_method TEXT,
  source public.cash_source NOT NULL DEFAULT 'manual',
  source_ref_id UUID,
  import_id UUID REFERENCES public.bank_imports(id) ON DELETE SET NULL,
  reconciliation_status public.reconciliation_status NOT NULL DEFAULT 'pending',
  matched_entry_type TEXT,
  matched_entry_id UUID,
  suggested_match JSONB,
  raw_data JSONB,
  dedupe_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_hash)
);
CREATE INDEX cash_tx_user_date_idx ON public.cash_transactions (user_id, transaction_date DESC);
CREATE INDEX cash_tx_status_idx ON public.cash_transactions (user_id, reconciliation_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash_transactions" ON public.cash_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cash_tx_updated BEFORE UPDATE ON public.cash_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- transaction_categories
CREATE TABLE public.transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction public.cash_direction NOT NULL,
  color TEXT DEFAULT '#22C55E',
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, direction)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_categories TO authenticated;
GRANT ALL ON public.transaction_categories TO service_role;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transaction_categories" ON public.transaction_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tx_cat_updated BEFORE UPDATE ON public.transaction_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  import_type text NOT NULL DEFAULT 'clients',
  file_name text NOT NULL,
  total_records integer NOT NULL DEFAULT 0,
  imported_records integer NOT NULL DEFAULT 0,
  duplicates_found integer NOT NULL DEFAULT 0,
  errors_found integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_details jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import history" ON public.import_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own import history" ON public.import_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own import history" ON public.import_history FOR DELETE USING (auth.uid() = user_id);

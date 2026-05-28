ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

CREATE POLICY "own usage insert" ON public.ai_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own usage update" ON public.ai_usage
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
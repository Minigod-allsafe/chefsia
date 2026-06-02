
CREATE TABLE public.recipe_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.ai_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid,
  dish_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','ready','failed')),
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_id)
);

CREATE INDEX recipe_videos_user_idx ON public.recipe_videos(user_id);
CREATE INDEX recipe_videos_chat_idx ON public.recipe_videos(chat_id);

GRANT SELECT, INSERT, UPDATE ON public.recipe_videos TO authenticated;
GRANT ALL ON public.recipe_videos TO service_role;

ALTER TABLE public.recipe_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own recipe videos"
  ON public.recipe_videos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users insert own recipe videos"
  ON public.recipe_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own recipe videos"
  ON public.recipe_videos FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_recipe_videos_org
  BEFORE INSERT ON public.recipe_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_row_org_from_user();

CREATE TRIGGER touch_recipe_videos_updated
  BEFORE UPDATE ON public.recipe_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

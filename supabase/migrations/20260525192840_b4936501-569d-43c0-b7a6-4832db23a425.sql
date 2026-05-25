
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Courses (public read)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_min INT DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses public read" ON public.courses FOR SELECT USING (true);

-- Course progress
CREATE TABLE public.course_progress (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  progress_pct INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress all" ON public.course_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI chats
CREATE TABLE public.ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chats all" ON public.ai_chats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI usage (rate-limit free 3/day)
CREATE TABLE public.ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage select" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);

-- Seed courses
INSERT INTO public.courses (title, description, thumbnail_url, video_url, duration_min, is_premium, position) VALUES
('Les bases de la pâtisserie française', 'Maîtrisez les techniques fondamentales : pâte brisée, sablée, feuilletée.', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', 'https://www.w3schools.com/html/mov_bbb.mp4', 45, false, 1),
('Macarons parisiens parfaits', 'Le secret des coques lisses et de la ganache équilibrée.', 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=800', 'https://www.w3schools.com/html/mov_bbb.mp4', 38, true, 2),
('Sauces mères et émulsions', 'Béarnaise, hollandaise, beurre blanc — la science derrière l''onctuosité.', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'https://www.w3schools.com/html/mov_bbb.mp4', 52, true, 3),
('Cuisson parfaite des viandes', 'Maillard, repos, températures à cœur. Devenez précis comme un chef étoilé.', 'https://images.unsplash.com/photo-1558030006-450675393462?w=800', 'https://www.w3schools.com/html/mov_bbb.mp4', 41, false, 4),
('Entremets modernes', 'Glaçage miroir, mousses aériennes, insertions fruitées.', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800', 'https://www.w3schools.com/html/mov_bbb.mp4', 60, true, 5);

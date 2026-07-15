
CREATE TABLE public.offer_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  city TEXT,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_suggestions TO authenticated;
GRANT ALL ON public.offer_suggestions TO service_role;
ALTER TABLE public.offer_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view suggestions"
  ON public.offer_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create suggestions"
  ON public.offer_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author can update own suggestions"
  ON public.offer_suggestions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author can delete own suggestions"
  ON public.offer_suggestions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.offer_suggestion_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.offer_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.offer_suggestion_votes TO authenticated;
GRANT ALL ON public.offer_suggestion_votes TO service_role;
ALTER TABLE public.offer_suggestion_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view votes"
  ON public.offer_suggestion_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can vote"
  ON public.offer_suggestion_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can remove own vote"
  ON public.offer_suggestion_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_offer_suggestions_updated_at
BEFORE UPDATE ON public.offer_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_suggestion_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.offer_suggestions SET votes_count = votes_count + 1 WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.offer_suggestions SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_bump_suggestion_votes_ins
AFTER INSERT ON public.offer_suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.bump_suggestion_votes();

CREATE TRIGGER trg_bump_suggestion_votes_del
AFTER DELETE ON public.offer_suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.bump_suggestion_votes();

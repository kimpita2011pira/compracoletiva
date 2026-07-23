ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS how_to_use_video_url TEXT,
ADD COLUMN IF NOT EXISTS how_to_use_manual_url TEXT;

COMMENT ON COLUMN public.platform_settings.how_to_use_video_url IS 'URL for the tutorial video displayed in help section';
COMMENT ON COLUMN public.platform_settings.how_to_use_manual_url IS 'URL for the user manual PDF or document';


-- Add enabled_features column to colleges table
ALTER TABLE public.colleges 
ADD COLUMN IF NOT EXISTS enabled_features jsonb NOT NULL DEFAULT '["attendance","lectures","messages","analytics","leaderboard","events","announcements","polls","achievements","daily_content","challenges","programmes"]'::jsonb;

-- Add secondary_color and banner_image columns as well (referenced in the prompt)
ALTER TABLE public.colleges
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS banner_image text;

-- Update existing colleges to have all features enabled by default
UPDATE public.colleges
SET enabled_features = '["attendance","lectures","messages","analytics","leaderboard","events","announcements","polls","achievements","daily_content","challenges","programmes"]'::jsonb
WHERE enabled_features IS NULL OR enabled_features = 'null'::jsonb;

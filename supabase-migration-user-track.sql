-- Add track column to user_profiles for separating FBM legacy vs GTM users
-- Default is 'fbm' (legacy) — GTM users will have 'gtm' set during signup
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'fbm';

-- Backfill: set track to 'gtm' for users whose ONLY projects are GTM
UPDATE user_profiles
SET track = 'gtm'
WHERE user_id IN (
  SELECT DISTINCT p.user_id
  FROM projects p
  WHERE p.track = 'gtm'
    AND NOT EXISTS (
      SELECT 1 FROM projects p2
      WHERE p2.user_id = p.user_id
        AND (p2.track IS NULL OR p2.track = 'fbm')
    )
);

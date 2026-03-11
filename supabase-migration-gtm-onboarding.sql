-- GTM BootCamp — Add gtm_onboarding_data column to projects table
-- Run this SQL in Supabase SQL Editor
--
-- Stores structured GTM onboarding data extracted from questionnaire answers.
-- The AI strategy generator prioritizes this structured data over raw answers.

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS gtm_onboarding_data JSONB DEFAULT NULL;

-- Add a comment describing the expected shape
COMMENT ON COLUMN projects.gtm_onboarding_data IS
  'Structured GTM onboarding data: { idea_name, pain_point, icp, uvp, revenue_model, origin_story, market_size, competitive_landscape, distribution_channels, validation_status, launch_goals }';

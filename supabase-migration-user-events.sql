-- FBM Studio — User Events Tracking Migration
-- Run this SQL in Supabase SQL Editor
-- Tracks page views, button clicks, and funnel progression for analytics

-- 1. User events table
CREATE TABLE IF NOT EXISTS user_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  event_type TEXT NOT NULL,          -- 'page_view', 'button_click', 'generation_start', 'generation_complete', 'step_complete', 'error'
  event_name TEXT NOT NULL,          -- e.g. 'strategy_page', 'generate_niches_click', 'niche_selected'
  step_name TEXT,                    -- funnel step: 'questionnaire', 'strategy', 'niches', 'pains', 'scripts', 'creative', 'video', 'copy', 'album'
  metadata JSONB DEFAULT '{}',       -- extra data: { niche_name, script_count, error_message, etc. }
  session_id TEXT,                   -- browser session identifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_step ON user_events(step_name);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_project ON user_events(project_id);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage user_events" ON user_events FOR ALL USING (true);

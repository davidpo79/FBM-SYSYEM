-- FBM Studio — RLS Security Fix
-- Run this SQL in Supabase SQL Editor to fix Security Advisor warnings
-- Date: 2026-03-25

-- ============================================================
-- 1. Enable RLS on all tables that have it disabled
-- ============================================================

ALTER TABLE IF EXISTS public.fbm_expert_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

-- admin_users: allow users to check their own admin status
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_users;
CREATE POLICY "Users can check own admin status" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);
ALTER TABLE IF EXISTS public.welcome_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. fbm_expert_conversations — add RLS policy
--    (table exists in DB but not in migrations)
-- ============================================================

-- Allow users to read their own conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fbm_expert_conversations' AND policyname = 'Users can read own expert conversations'
  ) THEN
    CREATE POLICY "Users can read own expert conversations"
      ON fbm_expert_conversations
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fbm_expert_conversations' AND policyname = 'Service role can manage expert conversations'
  ) THEN
    CREATE POLICY "Service role can manage expert conversations"
      ON fbm_expert_conversations
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 3. Fix overly permissive policies (USING (true) for anon)
--    These policies allow ANY user (including anon) full access
-- ============================================================

-- api_logs: restrict to service_role only
DROP POLICY IF EXISTS "Service role can manage api_logs" ON api_logs;
CREATE POLICY "Service role can manage api_logs"
  ON api_logs FOR ALL
  USING (auth.role() = 'service_role');

-- feedback_logs: restrict to service_role only
DROP POLICY IF EXISTS "Service role can manage feedback_logs" ON feedback_logs;
CREATE POLICY "Service role can manage feedback_logs"
  ON feedback_logs FOR ALL
  USING (auth.role() = 'service_role');

-- video_projects: restrict to own projects
DROP POLICY IF EXISTS "Users can manage own video projects" ON video_projects;
CREATE POLICY "Users can manage own video projects"
  ON video_projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = video_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- improvement_suggestions: fix duplicate overly permissive policies
DROP POLICY IF EXISTS "Users can manage own suggestions" ON improvement_suggestions;
DROP POLICY IF EXISTS "Service role full access suggestions" ON improvement_suggestions;
CREATE POLICY "Users can manage own suggestions"
  ON improvement_suggestions FOR ALL
  USING (auth.uid() = user_id);
CREATE POLICY "Service role full access suggestions"
  ON improvement_suggestions FOR ALL
  USING (auth.role() = 'service_role');

-- admin_notifications INSERT: restrict to service_role
DROP POLICY IF EXISTS "Service role can insert notifications" ON admin_notifications;
CREATE POLICY "Service role can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

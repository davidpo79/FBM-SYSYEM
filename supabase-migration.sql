-- FBM Studio — Admin Panel Migration
-- Run this SQL in Supabase SQL Editor

-- 1. Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can check own admin status" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- 2. User profiles (full name + billing)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  plan TEXT DEFAULT 'trial',
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_days INTEGER DEFAULT 30,
  subscription_status TEXT DEFAULT 'active',
  plan_price INTEGER DEFAULT 0,
  sumit_customer_id TEXT,
  trial_notifications JSONB DEFAULT '{"day3": false, "day2": false, "day1": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Billing columns hotfix (for existing deployments where user_profiles already exists)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sumit_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_notifications JSONB DEFAULT '{"day3": false, "day2": false, "day1": false}';
CREATE INDEX IF NOT EXISTS idx_trial_users ON user_profiles(trial_start) WHERE plan = 'trial';
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Welcome tokens
CREATE TABLE IF NOT EXISTS welcome_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  student_name TEXT NOT NULL,
  student_email TEXT,
  student_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  booking_confirmed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE welcome_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read valid tokens" ON welcome_tokens FOR SELECT USING (true);

-- 4. API logs
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage api_logs" ON api_logs FOR ALL USING (true);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON admin_notifications(user_id);
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON admin_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON admin_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON admin_notifications FOR INSERT USING (true);

-- 6. Consultations (one-time consulting sessions)
CREATE TABLE IF NOT EXISTS consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  transaction_id TEXT,
  amount DECIMAL(10,2) DEFAULT 1170.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  scheduled_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_user ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own consultations" ON consultations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage consultations" ON consultations
  FOR ALL USING (true);

-- 7. Improvement suggestions
CREATE TABLE IF NOT EXISTS improvement_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  conversation JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'done', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON improvement_suggestions(user_id);
ALTER TABLE improvement_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own suggestions" ON improvement_suggestions FOR ALL USING (true);
CREATE POLICY "Service role full access suggestions" ON improvement_suggestions FOR ALL USING (true);

-- 8. Video projects (video creator feature)
CREATE TABLE IF NOT EXISTS video_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) NOT NULL,
  script_index INTEGER NOT NULL DEFAULT 0,
  adapted_script JSONB NOT NULL,
  voice_settings JSONB DEFAULT '{"voice": "female", "rate": 1.0, "pitch": 0}',
  scenes_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, script_index)
);
CREATE INDEX IF NOT EXISTS idx_video_projects_project ON video_projects(project_id);
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own video projects" ON video_projects FOR ALL USING (true);

-- 9. Feedback logs (tracks user feedback on generated content)
CREATE TABLE IF NOT EXISTS feedback_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  step_name TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('approve', 'refine')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_logs_step ON feedback_logs(step_name);
CREATE INDEX IF NOT EXISTS idx_feedback_logs_created ON feedback_logs(created_at);
ALTER TABLE feedback_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage feedback_logs" ON feedback_logs FOR ALL USING (true);

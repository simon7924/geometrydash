-- ============================================================================
-- PULSE DASH - SUPABASE DATABASE SETUP
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This file sets up triggers and RLS policies for your existing tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE TRIGGER: Auto-create profile when user signs up
-- ----------------------------------------------------------------------------

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, total_stars, ai_trash_talk_enabled)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || NEW.id::text),
    0,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. RLS POLICIES FOR PROFILES TABLE
-- ----------------------------------------------------------------------------

-- Drop existing policies if any (cleanup)
-- NOTE: Do NOT create policies that query profiles table itself (e.g. is_admin checks)
-- as they cause infinite recursion. Use a single public SELECT policy only.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone (for leaderboard)" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;

-- Policy: Everyone can read profiles (needed for own profile + leaderboard)
-- Using a single SELECT policy avoids infinite recursion
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 4. RLS POLICIES FOR SCORES TABLE
-- ----------------------------------------------------------------------------

-- Drop existing policies if any (cleanup)
DROP POLICY IF EXISTS "Users can view their own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can insert their own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can update their own scores" ON public.scores;

-- Policy: Users can view their own scores
CREATE POLICY "Users can view their own scores"
  ON public.scores
  FOR SELECT
  USING (auth.uid() = player_id);

-- Policy: Scores are publicly readable for leaderboard
DROP POLICY IF EXISTS "Scores are publicly readable for leaderboard" ON public.scores;
CREATE POLICY "Scores are publicly readable for leaderboard"
  ON public.scores
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own scores
CREATE POLICY "Users can insert their own scores"
  ON public.scores
  FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Policy: Users can update their own scores
CREATE POLICY "Users can update their own scores"
  ON public.scores
  FOR UPDATE
  USING (auth.uid() = player_id);

-- ----------------------------------------------------------------------------
-- 5. ENSURE SCORES TABLE HAS REQUIRED COLUMNS
-- ----------------------------------------------------------------------------
-- Run this to add columns if they don't already exist.
-- If the scores table doesn't exist yet, create it:

CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level_id TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, level_id)
);

-- ----------------------------------------------------------------------------
-- 6. USER-CREATED LEVELS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Level',
  level_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- Anyone can read published levels
DROP POLICY IF EXISTS "User levels are publicly readable" ON public.user_levels;
CREATE POLICY "User levels are publicly readable"
  ON public.user_levels
  FOR SELECT
  USING (true);

-- Only creator can insert
DROP POLICY IF EXISTS "Users can insert their own levels" ON public.user_levels;
CREATE POLICY "Users can insert their own levels"
  ON public.user_levels
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Only creator can update
DROP POLICY IF EXISTS "Users can update their own levels" ON public.user_levels;
CREATE POLICY "Users can update their own levels"
  ON public.user_levels
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Only creator can delete
DROP POLICY IF EXISTS "Users can delete their own levels" ON public.user_levels;
CREATE POLICY "Users can delete their own levels"
  ON public.user_levels
  FOR DELETE
  USING (auth.uid() = creator_id);

-- ----------------------------------------------------------------------------
-- 7. VERIFICATION QUERIES (Optional - run separately to check)
-- ----------------------------------------------------------------------------

-- Uncomment these to verify everything is set up correctly:

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('profiles', 'scores');

-- Check policies on profiles table
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check policies on scores table
-- SELECT * FROM pg_policies WHERE tablename = 'scores';

-- Check if trigger exists
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

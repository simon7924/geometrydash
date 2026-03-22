// Browser-compatible version using Supabase CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://cgztcxgwnhpcphjgyqpf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnenRjeGd3bmhwY3Boamd5cXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzA1MzAsImV4cCI6MjA4NDM0NjUzMH0.-WjMbkbV6n8BrSZfDAq33Rwp-ikltHRF-S7-kHU7USU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Sign Up Function
// Creates a new user account and stores username in user metadata
// Database trigger will automatically create a profile record in profiles table
export async function signUp(email, password, username) {
  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        username: username  // Stored in user metadata
      }
    }
  })

  if (error) {
    console.error('Sign up error:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}

// Log In Function
// Verifies credentials and returns session with JWT token
export async function logIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (error) {
    console.error('Login error:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user, session: data.session }
}

// Log Out Function
// Invalidates the current session token
export async function logOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Logout error:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get Current User
// Retrieves the currently logged-in user with details (email, ID, metadata)
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Get Current Session
// Retrieves the current session including JWT token
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Listen for Auth Changes
// Fires whenever authentication changes (login, logout, session refresh)
// Use this to keep UI in sync with auth status
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event)

    if (event === 'SIGNED_IN') {
      console.log('User signed in:', session.user.email)
    }

    if (event === 'SIGNED_OUT') {
      console.log('User signed out')
    }

    // Call the provided callback function
    if (callback) {
      callback(event, session)
    }
  })
}

// Get user profile from database
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Get profile error:', error.message)
    return null
  }

  return data
}

// Update user profile
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('Update profile error:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// Save or update a level score using upsert
export async function saveLevelScore(userId, levelId, attempts, completed, bestPercent) {
  // First check if record exists to preserve best values
  const { data: existing } = await supabase
    .from('scores')
    .select('*')
    .eq('player_id', userId)
    .eq('level_id', levelId)
    .maybeSingle()

  const record = {
    player_id: userId,
    level_id: levelId,
    attempts: attempts,
    completed: completed,
    best_percent: bestPercent || 0,
    updated_at: new Date().toISOString()
  }

  // Accumulate attempts and preserve best values from existing record
  const wasAlreadyCompleted = existing?.completed || false
  if (existing) {
    record.attempts = (existing.attempts || 0) + attempts
    if (existing.completed) record.completed = true
    if (existing.best_percent > record.best_percent) record.best_percent = existing.best_percent
  }

  const { data, error } = await supabase
    .from('scores')
    .upsert(record, { onConflict: 'player_id,level_id' })
    .select()

  if (error) {
    console.error('Save score error:', error.message)
    return { success: false, error: error.message, wasAlreadyCompleted }
  }

  return { success: true, data, wasAlreadyCompleted }
}

// Get all scores for a user
export async function getUserScores(userId) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('player_id', userId)

  if (error) {
    console.error('Get scores error:', error.message)
    return []
  }

  return data || []
}

// Get leaderboard data
// Returns top players by total_stars and by total attempts
export async function getLeaderboard() {
  // Top players by stars
  const { data: starData, error: starError } = await supabase
    .from('profiles')
    .select('username, total_stars')
    .order('total_stars', { ascending: false })
    .limit(10)

  if (starError) {
    console.error('Leaderboard stars error:', starError.message)
  }

  // Top players by total attempts (most dedicated)
  // Sum attempts per player by joining scores
  const { data: attemptData, error: attemptError } = await supabase
    .from('scores')
    .select('player_id, attempts, profiles(username)')
    .order('attempts', { ascending: false })

  if (attemptError) {
    console.error('Leaderboard attempts error:', attemptError.message)
  }

  // Aggregate attempts per player
  const playerAttempts = {}
  if (attemptData) {
    for (const row of attemptData) {
      const uid = row.player_id
      const username = row.profiles?.username || 'Player'
      if (!playerAttempts[uid]) {
        playerAttempts[uid] = { username, total_attempts: 0 }
      }
      playerAttempts[uid].total_attempts += row.attempts || 0
    }
  }

  const attemptRanking = Object.values(playerAttempts)
    .sort((a, b) => b.total_attempts - a.total_attempts)
    .slice(0, 10)

  return {
    stars: starData || [],
    attempts: attemptRanking
  }
}

// Save an endless mode score and update stars if it's a new high score.
// Returns { success, newHighScore, starsEarned }
export async function saveEndlessScore(userId, score) {
  // Get previous best score for this player
  const { data: existing } = await supabase
    .from('endless_scores')
    .select('score')
    .eq('player_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle()

  const oldBest = existing?.score || 0
  const newHighScore = score > oldBest

  // Always insert the new run
  const { error } = await supabase
    .from('endless_scores')
    .insert({ player_id: userId, score })

  if (error) {
    console.error('Save endless score error:', error.message)
    return { success: false, error: error.message }
  }

  // If new high score, award stars: 1 star per 100 score, delta only
  let starsEarned = 0
  if (newHighScore) {
    const oldStars = Math.floor(oldBest / 100)
    const newStars = Math.floor(score / 100)
    starsEarned = newStars - oldStars
    if (starsEarned > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_stars')
        .eq('id', userId)
        .single()
      await supabase
        .from('profiles')
        .update({ total_stars: (profile?.total_stars || 0) + starsEarned })
        .eq('id', userId)
    }
  }

  return { success: true, newHighScore, starsEarned }
}

// Get endless leaderboard (best score per player, top 10)
export async function getEndlessLeaderboard() {
  const { data, error } = await supabase
    .from('endless_scores')
    .select('player_id, score, profiles!endless_scores_player_id_fkey(username)')
    .order('score', { ascending: false })

  if (error) {
    console.error('Endless leaderboard error:', error.message)
    return []
  }

  // Keep only best score per player
  const best = {}
  for (const row of (data || [])) {
    const uid = row.player_id
    const username = row.profiles?.username || 'Player'
    if (!best[uid] || row.score > best[uid].score) {
      best[uid] = { username, score: row.score }
    }
  }

  return Object.values(best)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

// ── User-Created Levels ──────────────────────────────────────────────────────

// Save a new user-created level (insert only — editors publish fresh)
export async function saveUserLevel(creatorId, name, levelData) {
  const { data, error } = await supabase
    .from('user_levels')
    .insert({ creator_id: creatorId, name, level_data: levelData })
    .select('id')
    .single()

  if (error) {
    console.error('Save user level error:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true, id: data.id }
}

// Get all levels created by a specific user
export async function getMyLevels(creatorId) {
  const { data, error } = await supabase
    .from('user_levels')
    .select('id, name, created_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my levels error:', error.message)
    return []
  }
  return data || []
}

// Get a single level by its UUID (for playing)
export async function getLevelById(levelId) {
  const { data, error } = await supabase
    .from('user_levels')
    .select('id, name, creator_id, level_data, created_at')
    .eq('id', levelId)
    .single()

  if (error) {
    console.error('Get level by id error:', error.message)
    return null
  }
  return data
}

// Get recent community levels (latest 50), with creator username via profiles join
export async function getCommunityLevels() {
  // Join through profiles using creator_id → profiles.id (same UUID)
  const { data, error } = await supabase
    .from('user_levels')
    .select('id, name, created_at, creator_id, profiles!user_levels_creator_id_profiles_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Get community levels error:', error.message)
    return []
  }
  return data || []
}

// Delete a user level (only works if RLS confirms ownership)
export async function deleteUserLevel(levelId) {
  const { error } = await supabase
    .from('user_levels')
    .delete()
    .eq('id', levelId)

  if (error) {
    console.error('Delete user level error:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ── User Stats ───────────────────────────────────────────────────────────────

// Get user stats summary
// Record that a player completed a community level (ignores if already recorded, ignores own levels)
export async function recordUserLevelCompletion(playerId, levelId) {
  // First check: don't count completing your own level
  const { data: level } = await supabase
    .from('user_levels')
    .select('creator_id')
    .eq('id', levelId)
    .single()
  if (!level || level.creator_id === playerId) return { success: false, ownLevel: true }

  const { error } = await supabase
    .from('user_level_completions')
    .insert({ player_id: playerId, level_id: levelId })
  // UNIQUE constraint means duplicate inserts silently fail — that's fine
  if (error && !error.message.includes('duplicate')) {
    console.error('recordUserLevelCompletion error:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Leaderboard: top players by number of distinct other-people's levels completed (>0 only)
export async function getCommunityLeaderboard() {
  const { data, error } = await supabase
    .from('user_level_completions')
    .select('player_id, profiles(username)')

  if (error) {
    console.error('Community leaderboard error:', error.message)
    return []
  }

  // Count completions per player
  const counts = {}
  for (const row of (data || [])) {
    const uid = row.player_id
    const username = row.profiles?.username || 'Player'
    if (!counts[uid]) counts[uid] = { username, count: 0 }
    counts[uid].count++
  }

  return Object.values(counts)
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export async function getUserStats(userId) {
  const scores = await getUserScores(userId)
  const profile = await getProfile(userId)

  const totalAttempts = scores.reduce((sum, s) => sum + (s.attempts || 0), 0)
  const levelsCompleted = scores.filter(s => s.completed).length
  const totalLevels = 8

  return {
    username: profile?.username || 'Player',
    totalStars: profile?.total_stars || 0,
    totalAttempts,
    levelsCompleted,
    totalLevels,
    scores
  }
}


import { createClient } from '@supabase/supabase-js'

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
import { supabase } from '../supabase.js'

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getSession() {
  return await supabase.auth.getSession()
}

export async function getUser() {
  return await supabase.auth.getUser()
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

export async function resetPassword(email) {
  return await supabase.auth.resetPasswordForEmail(email)
}
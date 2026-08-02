import { supabase } from '../supabase.js'

const TECHNICAL_ROLES = new Set([
  'coach', 'assistant', 'athletic_coach', 'goalkeeper_coach',
  'analyst', 'observer', 'physio', 'collaborator', 'sporting_director',
])
const APP_ROLES = new Set(['admin', 'collaborator', 'read_only'])

export function generateTemporaryPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const values = new Uint32Array(Math.max(10, length))
  crypto.getRandomValues(values)
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

export async function createStaffUser({ teamId, firstName, lastName, email, password, role, appRole }) {
  if (!supabase) throw new Error('Supabase non è configurato.')
  if (!firstName || !lastName) throw new Error('Inserisci nome e cognome.')
  if (!/^\S+@\S+\.\S+$/.test(String(email || ''))) throw new Error('Inserisci un indirizzo email valido.')
  if (String(password || '').length < 10) throw new Error('La password deve contenere almeno 10 caratteri.')
  if (!TECHNICAL_ROLES.has(role)) throw new Error('Ruolo tecnico non valido.')
  if (!APP_ROLES.has(appRole)) throw new Error('Livello di accesso non valido.')

  const { data, error } = await supabase.functions.invoke('create-staff-user', {
    body: { action: 'create', teamId: teamId || null, firstName, lastName, email, password, role, appRole },
  })
  if (error) {
    let detail = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) detail = body.error
    } catch {}
    throw new Error(detail || 'Creazione utente non riuscita.')
  }
  if (!data?.user?.id) throw new Error(data?.error || 'Risposta non valida dal server.')
  return data.user
}


export async function deleteStaffUser({ teamId, userId }) {
  if (!supabase) throw new Error('Supabase non è configurato.')
  if (!/^[0-9a-f-]{36}$/i.test(String(userId || ''))) throw new Error('Utente non valido.')

  const { data, error } = await supabase.functions.invoke('create-staff-user', {
    body: { action: 'delete', teamId: teamId || null, userId },
  })
  if (error) {
    let detail = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) detail = body.error
    } catch {}
    throw new Error(detail || 'Eliminazione utente non riuscita.')
  }
  if (data?.success !== true) throw new Error(data?.error || 'Risposta non valida dal server.')
  return data
}

import { supabase } from '../../supabase.js'

const cleanPayload = (payload = {}) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== undefined),
)

export async function listCalendarEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at')

  if (error) throw error
  return data ?? []
}

export async function createCalendarEvent(payload) {
  const { data, error } = await supabase
    .from('events')
    .insert(cleanPayload(payload))
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function updateCalendarEvent(eventId, payload) {
  if (!eventId) throw new Error('Evento non valido.')

  const { data, error } = await supabase
    .from('events')
    .update(cleanPayload(payload))
    .eq('id', eventId)
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarEvent(eventId) {
  if (!eventId) throw new Error('Evento non valido.')

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}

export async function getCalendarEvent(eventId) {
  if (!eventId) return null

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

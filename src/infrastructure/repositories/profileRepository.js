import { supabase } from '../../supabase.js'

export async function getProfileByUserId(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, app_role, active')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function updateCurrentProfile({ firstName, lastName }) {
  const { error } = await supabase.rpc('update_my_profile', {
    p_first_name: firstName,
    p_last_name: lastName,
  })

  if (error) throw error
}

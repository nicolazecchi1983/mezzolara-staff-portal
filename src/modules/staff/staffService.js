import { supabase } from '../../supabase.js'
import { createStaffUser, deleteStaffUser, generateTemporaryPassword } from '../../services/staffAdmin.js'

export { createStaffUser, deleteStaffUser, generateTemporaryPassword }

export async function loadTeamStaffProfiles(teamId, currentProfile = null) {
  if (!teamId) return currentProfile ? [currentProfile] : []

  const { data: memberships, error: membershipError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)

  if (membershipError) throw membershipError

  const userIds = [...new Set((memberships ?? []).map((item) => item.user_id).filter(Boolean))]
  if (!userIds.length) return currentProfile ? [currentProfile] : []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, app_role, active, updated_at')
    .in('id', userIds)
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateStaffProfile({ userId, firstName, lastName, technicalRole, accessRole, active }) {
  const { error } = await supabase.rpc('admin_update_staff_profile', {
    p_user_id: userId,
    p_first_name: firstName,
    p_last_name: lastName,
    p_role: technicalRole,
    p_app_role: accessRole,
    p_active: active,
  })

  if (error) throw error
}

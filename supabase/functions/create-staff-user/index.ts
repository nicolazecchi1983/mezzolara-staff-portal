import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const technicalRoles = new Set([
  'coach', 'assistant', 'athletic_coach', 'goalkeeper_coach',
  'analyst', 'observer', 'physio', 'collaborator', 'sporting_director',
])
const assignableAppRoles = new Set(['admin', 'collaborator', 'read_only'])

type JsonRecord = Record<string, unknown>

type TeamAccess = {
  teamId: string
  ownerId: string
  callerLevel: 'owner' | 'admin'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function isUuid(value: unknown): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

async function resolveTeamAccess(
  adminClient: ReturnType<typeof createClient>,
  callerId: string,
  requestedTeamId?: unknown,
): Promise<TeamAccess | null> {
  const requested = isUuid(requestedTeamId) ? String(requestedTeamId) : null

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('app_role, active')
    .eq('id', callerId)
    .maybeSingle()

  if (profileError || callerProfile?.active !== true) return null
  if (!['owner', 'admin'].includes(String(callerProfile?.app_role || ''))) return null

  // Quando il frontend conosce la squadra, la verifica direttamente.
  // L'accesso è valido se il chiamante è il proprietario reale oppure possiede
  // una membership attiva nella stessa squadra con livello owner/admin.
  if (requested) {
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, owner_id')
      .eq('id', requested)
      .maybeSingle()

    if (teamError || !team) return null
    if (team.owner_id === callerId) {
      return { teamId: team.id, ownerId: team.owner_id, callerLevel: 'owner' }
    }

    const { data: membership, error: membershipError } = await adminClient
      .from('team_members')
      .select('team_id, role, active')
      .eq('team_id', requested)
      .eq('user_id', callerId)
      .eq('active', true)
      .maybeSingle()

    if (membershipError || !membership) return null
    const callerLevel = callerProfile.app_role === 'owner' || membership.role === 'owner' ? 'owner' : 'admin'
    return { teamId: team.id, ownerId: team.owner_id, callerLevel }
  }

  // Fallback: prima cerca una squadra posseduta direttamente.
  const { data: owned, error: ownedError } = await adminClient
    .from('teams')
    .select('id, owner_id')
    .eq('owner_id', callerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!ownedError && owned) {
    return { teamId: owned.id, ownerId: owned.owner_id, callerLevel: 'owner' }
  }

  // Altrimenti usa la membership attiva e recupera separatamente la squadra.
  const { data: membership, error: membershipError } = await adminClient
    .from('team_members')
    .select('team_id, role, active')
    .eq('user_id', callerId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError || !membership?.team_id) return null

  const { data: team, error: teamError } = await adminClient
    .from('teams')
    .select('id, owner_id')
    .eq('id', membership.team_id)
    .maybeSingle()

  if (teamError || !team) return null
  const callerLevel = callerProfile.app_role === 'owner' || membership.role === 'owner' ? 'owner' : 'admin'
  return { teamId: team.id, ownerId: team.owner_id, callerLevel }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Configurazione server incompleta.' }, 500)
  if (!authorization) return json({ error: 'Sessione non valida.' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  const caller = userData?.user
  if (userError || !caller) return json({ error: 'Sessione non valida.' }, 401)

  let payload: JsonRecord
  try { payload = await request.json() } catch { return json({ error: 'Dati non validi.' }, 400) }

  const access = await resolveTeamAccess(adminClient, caller.id, payload.teamId)
  if (!access) return json({ error: 'Operazione riservata a Proprietario e Amministratore.' }, 403)

  const action = String(payload.action || 'create')

  if (action === 'delete') {
    const targetUserId = String(payload.userId || '')
    if (!isUuid(targetUserId)) return json({ error: 'Utente non valido.' }, 400)
    if (targetUserId === caller.id) return json({ error: 'Non puoi eliminare il tuo account.' }, 400)
    if (targetUserId === access.ownerId) return json({ error: 'Il Proprietario non può essere eliminato.' }, 403)

    const { data: targetMembership, error: targetMembershipError } = await adminClient
      .from('team_members')
      .select('user_id')
      .eq('team_id', access.teamId)
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetMembershipError || !targetMembership) return json({ error: 'L’utente non appartiene a questa squadra.' }, 404)

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('app_role')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetProfileError) return json({ error: 'Impossibile verificare il profilo da eliminare.' }, 500)
    if (access.callerLevel === 'admin' && targetProfile?.app_role === 'owner') {
      return json({ error: 'Un Amministratore non può eliminare il Proprietario.' }, 403)
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteAuthError) return json({ error: deleteAuthError.message || 'Eliminazione account non riuscita.' }, 500)

    await adminClient.from('team_members').delete().eq('team_id', access.teamId).eq('user_id', targetUserId)
    await adminClient.from('profiles').delete().eq('id', targetUserId)

    return json({ success: true, userId: targetUserId })
  }

  if (action !== 'create') return json({ error: 'Azione non supportata.' }, 400)

  const firstName = String(payload.firstName || '').trim().slice(0, 80)
  const lastName = String(payload.lastName || '').trim().slice(0, 80)
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const role = String(payload.role || '')
  const appRole = String(payload.appRole || '')

  if (!firstName || !lastName) return json({ error: 'Nome e cognome sono obbligatori.' }, 400)
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Email non valida.' }, 400)
  if (password.length < 10 || password.length > 128) return json({ error: 'La password deve contenere da 10 a 128 caratteri.' }, 400)
  if (!technicalRoles.has(role)) return json({ error: 'Ruolo tecnico non valido.' }, 400)
  if (!assignableAppRoles.has(appRole)) return json({ error: 'Livello di accesso non valido.' }, 400)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, must_change_password: true },
  })
  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes('already')
      ? 'Esiste già un utente con questa email.'
      : (createError?.message || 'Creazione account non riuscita.')
    return json({ error: message }, 409)
  }

  const userId = created.user.id
  const { error: profileUpsertError } = await adminClient.from('profiles').upsert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    app_role: appRole,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  const { error: membershipError } = await adminClient.from('team_members').upsert({
    team_id: access.teamId,
    user_id: userId,
    role: appRole === 'admin' ? 'admin' : 'member',
    active: true,
  }, { onConflict: 'team_id,user_id' })

  if (profileUpsertError || membershipError) {
    await adminClient.auth.admin.deleteUser(userId)
    return json({ error: profileUpsertError?.message || membershipError?.message || 'Associazione alla squadra non riuscita.' }, 500)
  }

  return json({
    user: { id: userId, firstName, lastName, email, role, appRole, teamId: access.teamId },
  }, 201)
})

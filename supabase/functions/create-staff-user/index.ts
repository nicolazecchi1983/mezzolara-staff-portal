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
const appRoles = new Set(['admin', 'collaborator', 'read_only'])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
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

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('app_role, active')
    .eq('id', caller.id)
    .maybeSingle()
  if (profileError || callerProfile?.active !== true || callerProfile?.app_role !== 'admin') {
    return json({ error: 'Operazione riservata all’amministratore.' }, 403)
  }

  let payload: Record<string, unknown>
  try { payload = await request.json() } catch { return json({ error: 'Dati non validi.' }, 400) }

  const teamId = String(payload.teamId || '')
  const firstName = String(payload.firstName || '').trim().slice(0, 80)
  const lastName = String(payload.lastName || '').trim().slice(0, 80)
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const role = String(payload.role || '')
  const appRole = String(payload.appRole || '')

  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return json({ error: 'Squadra non valida.' }, 400)
  if (!firstName || !lastName) return json({ error: 'Nome e cognome sono obbligatori.' }, 400)
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Email non valida.' }, 400)
  if (password.length < 10 || password.length > 128) return json({ error: 'La password deve contenere da 10 a 128 caratteri.' }, 400)
  if (!technicalRoles.has(role)) return json({ error: 'Ruolo tecnico non valido.' }, 400)
  if (!appRoles.has(appRole)) return json({ error: 'Funzione nell’app non valida.' }, 400)

  const { data: ownedTeam, error: teamError } = await adminClient
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('owner_id', caller.id)
    .maybeSingle()
  if (teamError || !ownedTeam) return json({ error: 'Non puoi gestire questa squadra.' }, 403)

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
    team_id: teamId,
    user_id: userId,
    role: appRole === 'admin' ? 'admin' : 'member',
    active: true,
  }, { onConflict: 'team_id,user_id' })

  if (profileUpsertError || membershipError) {
    await adminClient.auth.admin.deleteUser(userId)
    return json({ error: profileUpsertError?.message || membershipError?.message || 'Associazione alla squadra non riuscita.' }, 500)
  }

  return json({
    user: { id: userId, firstName, lastName, email, role, appRole },
  }, 201)
})

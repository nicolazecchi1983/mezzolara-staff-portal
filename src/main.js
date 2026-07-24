import './style.css'
import { isSupabaseConfigured, supabase } from './supabase.js'
import { renderLogin } from './components/login.js'
import { renderApp, attachAppEvents } from './components/app.js'

const app = document.querySelector('#app')

function showLogin() {
  app.innerHTML = renderLogin({ configured: isSupabaseConfigured })

  document.querySelector('#togglePassword')?.addEventListener('click', () => {
    const input = document.querySelector('#password')
    const button = document.querySelector('#togglePassword')
    const visible = input.type === 'text'
    input.type = visible ? 'password' : 'text'
    button.textContent = visible ? 'Mostra' : 'Nascondi'
  })

  document.querySelector('#loginForm')?.addEventListener('submit', async event => {
    event.preventDefault()
    if (!supabase) return
    const data = new FormData(event.currentTarget)
    const button = document.querySelector('#loginButton')
    const message = document.querySelector('#authMessage')
    button.disabled = true
    button.textContent = 'Accesso in corso...'
    message.textContent = ''

    const { error } = await supabase.auth.signInWithPassword({
      email: String(data.get('email') ?? '').trim(),
      password: String(data.get('password') ?? ''),
    })

    button.disabled = false
    button.textContent = 'Accedi'

    if (error) {
      message.textContent = 'Credenziali non valide oppure utente non autorizzato.'
      return
    }

    await showDashboard()
  })
}

async function showDashboard() {
  if (!supabase) return showLogin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return showLogin()

  app.innerHTML = renderApp(user)
  attachAppEvents()

  document.querySelector('#logoutButton')?.addEventListener('click', async () => {
    await supabase.auth.signOut()
    showLogin()
  })
}

async function initialize() {
  if (!isSupabaseConfigured || !supabase) return showLogin()
  const { data: { session } } = await supabase.auth.getSession()
  session ? await showDashboard() : showLogin()

  supabase.auth.onAuthStateChange((_event, sessionData) => {
    sessionData ? showDashboard() : showLogin()
  })
}

initialize()

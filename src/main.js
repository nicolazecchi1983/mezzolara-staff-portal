import './style.css'

import { isSupabaseConfigured, supabase } from './supabase.js'

import {
  signIn,
  signOut,
  getSession,
  getUser,
  onAuthStateChange,
} from './services/auth.js'

import { renderLogin } from './components/login.js'
import { renderApp, attachAppEvents } from './components/app.js'

const app = document.querySelector('#app')

function attachPasswordToggle() {
  document.querySelector('#togglePassword')?.addEventListener('click', () => {
    const input = document.querySelector('#password')
    const button = document.querySelector('#togglePassword')

    const visible = input.type === 'text'

    input.type = visible ? 'password' : 'text'
    button.textContent = visible ? 'Mostra' : 'Nascondi'
  })
}

async function showLogin() {
  app.innerHTML = renderLogin({
    configured: isSupabaseConfigured,
  })

  attachPasswordToggle()

  document
    .querySelector('#loginForm')
    ?.addEventListener('submit', async event => {
      event.preventDefault()

      if (!supabase) return

      const form = new FormData(event.currentTarget)

      const email = String(form.get('email') ?? '').trim()

      const password = String(form.get('password') ?? '')

      const button = document.querySelector('#loginButton')

      const message = document.querySelector('#authMessage')

      button.disabled = true
      button.textContent = 'Accesso...'

      message.textContent = ''

      const { error } = await signIn(email, password)

      button.disabled = false
      button.textContent = 'Accedi'

      if (error) {
        message.textContent =
          'Email o password non corrette.'
        return
      }

      await showDashboard()
    })
}

async function showDashboard() {
  const {
    data: { user },
  } = await getUser()

  if (!user) {
    return showLogin()
  }

  app.innerHTML = renderApp(user)

  attachAppEvents(user)

  document
    .querySelector('#logoutButton')
    ?.addEventListener('click', async () => {
      await signOut()
    })
}

async function initialize() {
  if (!isSupabaseConfigured || !supabase) {
    return showLogin()
  }

  const {
    data: { session },
  } = await getSession()

  if (session) {
    await showDashboard()
  } else {
    await showLogin()
  }

  onAuthStateChange((_event, session) => {
    if (session) {
      showDashboard()
    } else {
      showLogin()
    }
  })
}

initialize()
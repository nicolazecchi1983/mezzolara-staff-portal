import { icon } from './icons.js'
import { supabase } from '../supabase.js'

import {
  players,
  analysisItems,
} from '../data/appData.js'

let calendarEvents = []
let currentUserRole = 'observer'
let currentUser = null
let currentUserProfile = null
let staffProfiles = []
let analysisEntries = []
let playerProfiles = {}
let currentCalendarDate = new Date()
currentCalendarDate.setDate(1)

function isOwner() {
  return ['owner', 'admin', 'administrator'].includes(currentUserRole)
}

function roleLabel(role) {
  const labels = {
    owner: 'Amministratore',
    coach: 'Allenatore',
    assistant: 'Vice allenatore',
    athletic_coach: 'Preparatore fisico',
    goalkeeper_coach: 'Preparatore portieri',
    analyst: 'Match analyst',
    observer: 'Osservatore',
    physio: 'Fisioterapista',
    collaborator: 'Collaboratore',
    sporting_director: 'Direttore sportivo',
    read_only: 'Solo lettura',
  }

  return labels[role] ?? 'Staff'
}

function profileFullName(profile, user = currentUser) {
  const joined = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (joined) return joined

  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name
  if (metadataName) return metadataName

  const localPart = user?.email?.split('@')[0] || 'Utente'
  return localPart
    .replace(/\d+$/g, '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Utente'
}

async function loadCurrentUserRole(user) {
  if (!user?.id) {
    currentUserRole = 'observer'
    currentUserProfile = null
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Errore caricamento profilo:', error.message)
    currentUserRole = 'observer'
    currentUserProfile = null
    return
  }

  currentUserProfile = data ?? null
  currentUserRole = data?.role ?? 'observer'

  if (data?.active === false) {
    await supabase.auth.signOut()
    throw new Error('Account disattivato')
  }
}

async function loadAnalysisEntries() {
  const { data, error } = await supabase
    .from('match_analysis')
    .select('*')
    .order('match_date', { ascending: false })
    .order('minute', { ascending: true })

  if (error) {
    console.warn('Analisi gare non ancora collegata:', error.message)
    analysisEntries = []
    return
  }

  analysisEntries = data ?? []
}

async function loadPlayerProfiles() {
  const { data, error } = await supabase
    .from('player_profiles')
    .select('*')

  if (error) {
    console.warn('Schede giocatore non ancora collegate:', error.message)
    playerProfiles = {}
    return
  }

  playerProfiles = Object.fromEntries((data ?? []).map((profile) => [profile.player_key, profile]))
}

function playerKey(name = '') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it-IT')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function loadStaffProfiles() {
  if (!isOwner()) {
    staffProfiles = []
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, active, updated_at')
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })

  if (error) {
    console.error('Errore caricamento staff:', error.message)
    staffProfiles = []
    return
  }

  staffProfiles = data ?? []
}

function syncProfileHeader() {
  const name = profileFullName(currentUserProfile)
  const initial = name.charAt(0).toUpperCase() || 'N'
  const label = roleLabel(currentUserRole)

  document.querySelectorAll('.profile-menu-identity strong, .profile-dropdown-head strong')
    .forEach((node) => { node.textContent = name })
  document.querySelectorAll('.profile-menu-identity small')
    .forEach((node) => { node.textContent = label })
  document.querySelectorAll('.avatar-initial')
    .forEach((node) => { node.textContent = initial })
}

async function loadCalendarEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at')

  if (error) {
    alert(`Errore Supabase: ${error.message}`)
    return
  }

  calendarEvents = await Promise.all(
    data.map(async (event) => {
      const trainingSheetPath = event.training_sheet_path ?? null
      let trainingSheetUrl = null

      if (trainingSheetPath) {
        const { data: signedData, error: signedError } =
          await supabase.storage
            .from('training-sheets')
            .createSignedUrl(trainingSheetPath, 3600)

        if (!signedError) {
          trainingSheetUrl = signedData.signedUrl
        }
      }

      const parsedNotes = (() => {
        try { return JSON.parse(event.notes || '{}') } catch { return {} }
      })()
      const titleMatchData = parseMatchTitle(event.title)

      return {
        id: event.id,
        day: new Date(event.start_at).getDate(),
        title: event.title,
        time: new Date(event.start_at).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        place: event.location || '',
        type: event.event_type || 'training',
        startAt: event.start_at,
        matchDay: event.match_day ?? null,
        presentCount: event.present_count ?? null,
        squadTotal: event.squad_total ?? null,
        trainingSheetPath,
        trainingSheetUrl,
        editorData: parsedNotes?.type === 'training_sheet_editor' ? parsedNotes.data : null,
        matchType: event.match_type || (parsedNotes?.type === 'match_event' ? parsedNotes.match_type || null : null) || titleMatchData.matchType,
        opponent: event.opponent || (parsedNotes?.type === 'match_event' ? parsedNotes.opponent || '' : '') || titleMatchData.opponent,
        rawNotes: event.notes || null,
      }
    }),
  )
}

const menu = [
  ['dashboard', 'Dashboard'],
  ['calendar', 'Calendario'],
  ['training-sheet', 'Training Sheet Editor'],
  ['library', 'Training Library'],
  ['squad', 'Rosa'],
  ['analysis', 'Analisi Gare'],
  ['methodology', 'Metodologia'],
  ['settings', 'Impostazioni'],
]

function menuHtml() {
  return menu
    .map(
      ([key, label], index) => `
        <button
          class="nav-item ${index === 0 ? 'is-active' : ''}"
          type="button"
          data-section="${key}"
        >
          <span class="nav-icon">${icon(key)}</span>
          <span>${label}</span>
        </button>
      `,
    )
    .join('')
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDateInputValue(dateLike) {
  const date = new Date(dateLike)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isTrainingEventType(type) {
  return type === 'training'
}

function getUpcomingEvents() {
  const today = startOfToday()
  return calendarEvents.filter(
    (event) => new Date(event.startAt) >= today,
  )
}

function getNextTraining() {
  return getUpcomingEvents().find(
    (event) => event.type === 'training',
  ) ?? null
}

function getTodayEvents() {
  const today = startOfToday()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return calendarEvents.filter((event) => {
    const date = new Date(event.startAt)
    return date >= today && date < tomorrow
  })
}

function dashboardStatsData() {
  const nextTraining = getNextTraining()
  const todayEvents = getTodayEvents()
  const sheets = calendarEvents.filter(
    (event) => event.trainingSheetPath,
  ).length
  const upcoming = getUpcomingEvents().length

  return [
    {
      label: 'Prossimo allenamento',
      value: nextTraining?.time ?? '—',
      meta: nextTraining
        ? `${new Date(nextTraining.startAt).toLocaleDateString('it-IT')} · ${nextTraining.place || 'Luogo non indicato'}`
        : 'Nessun allenamento programmato',
      icon: 'calendar',
    },
    {
      label: 'Impegni di oggi',
      value: String(todayEvents.length),
      meta: todayEvents.length === 1 ? '1 attività programmata' : `${todayEvents.length} attività programmate`,
      icon: 'squad',
    },
    {
      label: 'Training Sheet',
      value: String(sheets),
      meta: 'Collegate al calendario',
      icon: 'sheet',
    },
    {
      label: 'Prossimi impegni',
      value: String(upcoming),
      meta: 'Da oggi in avanti',
      icon: 'analysis',
    },
  ]
}

function statCards() {
  return dashboardStatsData()
    .map(
      (item) => `
        <article class="stat-card">
          <div class="stat-icon">
            ${icon(item.icon)}
          </div>

          <div>
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <small>${item.meta}</small>
          </div>
        </article>
      `,
    )
    .join('')
}

function dashboardView() {
  const now = new Date()
  const today = startOfToday()
  const day = (today.getDay() + 6) % 7
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - day)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const weekEvents = calendarEvents
    .filter((event) => {
      const date = new Date(event.startAt)
      return date >= weekStart && date < weekEnd
    })
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  const weeklyTrainings = weekEvents.filter((event) => event.type === 'training')
  const nextMatches = calendarEvents
    .filter((event) => event.type === 'match' && new Date(event.startAt) >= now)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    .slice(0, 3)

  const dayDiff = (from, to) => {
    const start = new Date(from)
    const end = new Date(to)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return Math.max(0, Math.round((end - start) / 86400000))
  }

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const events = weekEvents.filter((event) => new Date(event.startAt).toDateString() === date.toDateString())
    return { date, events }
  })

  return `
    <section class="view page-view dashboard-professional">
      <div class="page-head">
        <div><h1>Dashboard</h1><p><span>STAGIONE 2026/27</span><b>•</b>Panoramica operativa</p></div>
      </div>

      <div class="dashboard-primary-grid">
        <article class="dashboard-feature-card dashboard-next-match">
          <div class="dashboard-card-kicker">PROSSIME PARTITE</div>
          ${nextMatches.length ? `
            <div class="dashboard-match-list">
              ${nextMatches.map((match, index) => {
                const previous = index === 0 ? today : new Date(nextMatches[index - 1].startAt)
                const distance = dayDiff(previous, new Date(match.startAt))
                const distanceLabel = index === 0
                  ? (distance === 0 ? 'Oggi' : distance === 1 ? 'Domani' : `Tra ${distance} giorni`)
                  : (distance === 1 ? '1 giorno dalla precedente' : `${distance} giorni dalla precedente`)
                return `
                  <article class="dashboard-match-item">
                    <button type="button" data-open-event="${match.id}" aria-label="Apri ${escapeHtml(match.title || 'partita')}">
                      <div class="dashboard-match-main"><span class="dashboard-match-date">${new Date(match.startAt).toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</span><strong>${match.time}</strong></div>
                      <h2>${escapeHtml(match.title || 'Partita')}</h2>
                      <p>${match.matchType ? `<span class="match-kind match-kind--${escapeHtml(match.matchType)}">${escapeHtml(matchTypeLabel(match.matchType))}</span>` : ''}${escapeHtml(match.place || 'Campo da definire')}</p>
                      <small class="dashboard-match-distance">${distanceLabel}</small>
                    </button>
                  </article>`
              }).join('')}
            </div>
          ` : '<div class="dashboard-empty-state">Nessuna partita futura programmata.</div>'}
        </article>

        <article class="dashboard-feature-card">
          <div class="dashboard-card-head"><div><span>ALLENAMENTI SETTIMANA</span><h2>${weeklyTrainings.length} sedute</h2></div><b>${weekStart.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}–${new Date(weekEnd-1).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}</b></div>
          <div class="dashboard-training-history">
            ${weeklyTrainings.length ? weeklyTrainings.map((event)=>`
              <button type="button" data-open-event="${event.id}">
                <span>${new Date(event.startAt).toLocaleDateString('it-IT',{weekday:'short',day:'numeric'})}</span>
                <strong>${event.time} · ${escapeHtml(event.place || 'Campo da definire')}</strong>
                <small>${event.matchDay || 'MD —'}${event.trainingSheetPath ? ' · TS pubblicata' : ' · TS assente'}</small>
              </button>`).join('') : '<div class="dashboard-empty-state">Nessun allenamento nella settimana corrente.</div>'}
          </div>
        </article>
      </div>

      <article class="dashboard-week-card">
        <div class="dashboard-card-head"><div><span>CALENDARIO SETTIMANALE</span><h2>${formatLongDate(today)}</h2></div><button type="button" class="ghost-button" data-dashboard-calendar>Apri calendario</button></div>
        <div class="dashboard-week-grid">
          ${weekDays.map(({date,events})=>`
            <div class="dashboard-day ${date.toDateString()===today.toDateString()?'is-today':''}">
              <header><span>${date.toLocaleDateString('it-IT',{weekday:'short'}).toUpperCase()}</span><strong>${date.getDate()}</strong></header>
              <div>${events.length?events.map(event=>`<button type="button" data-open-event="${event.id}" class="is-${event.type} ${event.type === 'match' && event.matchType ? `is-match-${event.matchType}` : ''}"><b>${event.time}</b><span>${escapeHtml(event.title)}</span><small>${event.matchDay || escapeHtml(event.place || '')}</small></button>`).join(''):'<em>—</em>'}</div>
            </div>`).join('')}
        </div>
      </article>
    </section>
  `
}

function eventTypeIcon(type) {
  const icons = {
    training: 'calendar',
    match: 'analysis',
    meeting: 'methodology',
    rest: 'close',
  }

  return icon(icons[type] ?? 'calendar')
}

function matchTypeLabel(value) {
  return ({ friendly: 'Amichevole', cup: 'Coppa', league: 'Campionato' })[value] || 'Partita'
}

function matchTypeValueFromLabel(value = '') {
  const normalized = String(value).trim().toLowerCase()
  return ({ amichevole: 'friendly', coppa: 'cup', campionato: 'league' })[normalized] || null
}

function parseMatchTitle(title = '') {
  const parts = String(title).split('·').map((part) => part.trim()).filter(Boolean)
  if (!/^partita$/i.test(parts[0] || '')) return { matchType: null, opponent: '' }
  const matchType = matchTypeValueFromLabel(parts[1] || '')
  const opponent = String(parts[2] || '').replace(/^vs\s+/i, '').trim()
  return { matchType, opponent }
}

function buildEventTitle(eventType, matchType, opponent) {
  if (eventType !== 'match') {
    return ({ training: 'Allenamento', meeting: 'Riunione', rest: 'Riposo' })[eventType] || 'Evento'
  }
  const parts = ['Partita', matchTypeLabel(matchType)]
  parts.push(`vs ${String(opponent || 'Da definire').trim() || 'Da definire'}`)
  return parts.join(' · ')
}

function eventPlaceLabel(event) {
  return event.place ? ` · ${event.place}` : ''
}

function calendarCells() {
  const year = currentCalendarDate.getFullYear()
  const month = currentCalendarDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const mondayIndex = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((mondayIndex + lastDay.getDate()) / 7) * 7
  const today = new Date()

  return Array.from({ length: totalCells }, (_, index) => {
    const cellDate = new Date(year, month, index - mondayIndex + 1)
    const muted = cellDate.getMonth() !== month
    const day = cellDate.getDate()
    const dateValue = formatDateInputValue(cellDate)

    const events = calendarEvents.filter((item) => {
      const eventDate = new Date(item.startAt)
      return (
        eventDate.getFullYear() === cellDate.getFullYear() &&
        eventDate.getMonth() === cellDate.getMonth() &&
        eventDate.getDate() === cellDate.getDate()
      )
    })

    const isToday =
      cellDate.getFullYear() === today.getFullYear() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getDate() === today.getDate()

    return `
      <div
        class="calendar-cell ${muted ? 'is-muted' : ''} ${isToday ? 'is-today' : ''}"
        ${!muted && isOwner() ? `data-create-event-date="${dateValue}"` : ''}
      >
        <span class="day-number ${isToday ? 'is-today' : ''}">
          ${day}
        </span>

        <div class="calendar-cell-events">
          ${events
            .map(
              (event) => `
                <button
                  class="calendar-event calendar-event--${event.type} ${event.type === 'match' && event.matchType ? `calendar-event--match-${event.matchType}` : ''}"
                  data-open-event="${event.id}"
                  type="button"
                >
                  <strong>
                    <span class="calendar-event__icon">
                      ${eventTypeIcon(event.type)}
                    </span>
                    ${event.title}
                  </strong>

                  <span>${event.time}${eventPlaceLabel(event)}</span>
                  ${event.type === 'training' ? `<small class="calendar-event-details">${event.matchDay || 'MD —'}${event.editorData?.focus ? ` · ${escapeHtml(event.editorData.focus)}` : ''}${event.trainingSheetPath ? ' · TS' : ''}</small>` : ''}
                  ${event.type === 'match' && event.matchType ? `<small class="calendar-event-details">${escapeHtml(matchTypeLabel(event.matchType))}</small>` : ''}
                </button>
              `,
            )
            .join('')}
        </div>
      </div>
    `
  }).join('')
}

function calendarMonthTitle() {
  const title = new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(currentCalendarDate)

  return title.charAt(0).toUpperCase() + title.slice(1)
}

function goToCurrentMonth() {
  const today = new Date()
  currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1)
}

function calendarView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Calendario</h1>

          <p>
            <span>STAGIONE 2026/27</span>
            <b>•</b>
            Serie D
          </p>
        </div>

        <div class="page-head-actions calendar-page-actions">
          <button
            class="calendar-today-button calendar-today-button--prominent"
            type="button"
            data-calendar-today
          >Oggi</button>

          ${isOwner()
            ? `
                <button class="primary-action" type="button" data-new-event>
                  ${icon('plus')}
                  Nuovo evento
                </button>
              `
            : ''}
        </div>
      </div>

      <section class="calendar-panel">
        <div class="calendar-toolbar calendar-toolbar--clean">
          <button
            class="calendar-month-nav"
            type="button"
            data-calendar-prev
            aria-label="Mese precedente"
          >‹</button>

          <h2>${calendarMonthTitle()}</h2>

          <button
            class="calendar-month-nav"
            type="button"
            data-calendar-next
            aria-label="Mese successivo"
          >›</button>

        </div>

        <div class="calendar-weekdays">
          <span>LUN</span>
          <span>MAR</span>
          <span>MER</span>
          <span>GIO</span>
          <span>VEN</span>
          <span>SAB</span>
          <span>DOM</span>
        </div>

        <div class="calendar-grid">
          ${calendarCells()}
        </div>
      </section>
    </section>
  `
}

function squadView() {
  const roleOrder = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante']
  const roleLabels = {
    Portiere: 'Portieri',
    Difensore: 'Difensori',
    Centrocampista: 'Centrocampisti',
    Attaccante: 'Attaccanti',
  }
  const activePlayers = players.filter((player) => player.name !== 'Andrea Giovannini')

  const groupedPlayers = roleOrder.map((role) => ({
    role,
    label: roleLabels[role],
    players: activePlayers
      .filter((player) => player.role === role)
      .sort((a, b) => {
        const surnameA = String(a.name).trim().split(/\s+/).pop() || ''
        const surnameB = String(b.name).trim().split(/\s+/).pop() || ''
        return surnameA.localeCompare(surnameB, 'it', { sensitivity: 'base' })
      }),
  })).filter((group) => group.players.length)

  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Rosa</h1>
          <p><span>${activePlayers.length} GIOCATORI</span><b>•</b>Serie D</p>
        </div>
        <button class="primary-action" type="button">${icon('plus')}Nuovo giocatore</button>
      </div>

      <div class="squad-departments">
        ${groupedPlayers.map((group) => `
          <section class="squad-department">
            <div class="squad-department-head">
              <div>
                <span>${icon('squad')}</span>
                <h2>${group.label}</h2>
              </div>
              <b>${group.players.length}</b>
            </div>
            <div class="players-grid">
              ${group.players.map((player) => `
                <button class="player-card player-card--button" type="button" data-player-profile="${playerKey(player.name)}">
                  <div class="player-avatar">${player.initials}</div>
                  <div class="player-main">
                    <h3>${player.name}</h3>
                    <p>${player.year} · ${player.role}</p>
                  </div>
                  <div class="player-meta">
                    <span>Piede ${player.foot}</span>
                    <strong class="${player.status === 'Disponibile' ? 'ok' : 'warn'}">${player.status}</strong>
                  </div>
                </button>
              `).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    </section>
  `
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function analysisOutcomeClass(value) {
  const normalized = String(value ?? '').toLocaleLowerCase('it-IT')
  return normalized.includes('positivo') ? 'is-positive' : 'is-improve'
}

function analysisView() {
  const items = analysisEntries.map((entry) => `
    <article class="match-analysis-row">
      <div class="match-analysis-minute">${entry.minute ? `${escapeHtml(entry.minute)}'` : '—'}</div>
      <div class="match-analysis-content">
        <div class="match-analysis-topline">
          <strong>${escapeHtml(entry.match_name || 'Partita non indicata')}</strong>
          <span class="analysis-outcome ${analysisOutcomeClass(entry.outcome)}">${escapeHtml(entry.outcome || 'Da classificare')}</span>
        </div>
        <p>${escapeHtml(entry.observation || 'Nessuna osservazione')}</p>
        <div class="match-analysis-meta">
          <span>${escapeHtml(entry.observer || 'Osservatore non indicato')}</span>
          <span>${escapeHtml(entry.game_phase || 'Fase non indicata')}</span>
          <span>${entry.match_date ? new Date(entry.match_date).toLocaleDateString('it-IT') : 'Data non indicata'}</span>
        </div>
      </div>
    </article>
  `).join('')

  return `
    <section class="view page-view analysis-view">
      <div class="page-head analysis-page-head">
        <div>
          <h1>Analisi Gare</h1>
          <p><span>OSSERVAZIONI PARTITA</span><b>•</b>Google Form + Supabase</p>
        </div>
        <div class="page-actions analysis-actions">
          <a class="ghost-button analysis-form-link" href="https://docs.google.com/forms/d/1dMx3J-lz8loospyKAx8Fdfi0oh0W1cGkUFZBMu6U_WU/edit" target="_blank" rel="noopener noreferrer">Apri Google Form</a>
          ${isOwner() ? `<button class="primary-action" type="button" data-import-analysis>Importa CSV</button>` : ''}
          <input type="file" accept=".csv,text/csv" data-analysis-file hidden>
        </div>
      </div>

      <div class="analysis-embryo-note">
        <strong>Prima versione operativa</strong>
        <span>Compila il Google Form. Scarica il foglio risposte in CSV e importalo qui: le osservazioni vengono archiviate e ordinate per partita e minuto.</span>
      </div>

      <div class="analysis-toolbar">
        <input type="search" placeholder="Cerca partita, osservatore, fase o testo..." data-analysis-search>
        <span data-analysis-count>${analysisEntries.length} osservazioni</span>
      </div>

      <div class="match-analysis-list" data-analysis-list>
        ${items || `
          <div class="analysis-empty-state">
            <div>${icon('analysis')}</div>
            <h2>Nessuna analisi importata</h2>
            <p>Le risposte del Google Form compariranno qui dopo l'importazione del CSV.</p>
          </div>
        `}
      </div>
      <p class="form-message" data-analysis-message></p>
    </section>
  `
}


function startOfWeek(dateLike) {
  const date = new Date(dateLike)
  date.setHours(0, 0, 0, 0)
  const mondayOffset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - mondayOffset)
  return date
}

function endOfWeek(dateLike) {
  const date = startOfWeek(dateLike)
  date.setDate(date.getDate() + 6)
  return date
}

function dateKey(dateLike) {
  const date = new Date(dateLike)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function trainingSheetName(event) {
  const path = String(event.trainingSheetPath ?? '')
  const rawName = decodeURIComponent(path.split('/').pop() || '')
    .replace(/^[0-9a-f-]{36}-/i, '')
    .replace(/\.(png|jpe?g|webp|pdf)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()

  // Uniforma nomi come AL006, AL 006, AL_006 e ALL 006 29072026.
  const codeMatch = rawName.match(/\bA(?:L|LL)\s*0*(\d{1,3})\b/i)
  if (codeMatch) {
    return `AL_${String(codeMatch[1]).padStart(3, '0')}`
  }

  return rawName || `TS ${new Date(event.startAt).toLocaleDateString('it-IT')}`
}

function formatSheetDate(dateLike) {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateLike))
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart)
  const end = endOfWeek(start)
  const sameMonth = start.getMonth() === end.getMonth()

  const startText = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'long' }),
  }).format(start)

  const endText = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
  }).format(end)

  return `${startText} – ${endText}`
}

function sheetTypeLabel(event) {
  const labels = {
    training: 'Allenamento',
    match: 'Partita',
    meeting: 'Riunione',
    rest: 'Riposo',
  }
  return labels[event.type] ?? event.title ?? 'Allenamento'
}

function trainingLibraryGroups() {
  const sheets = calendarEvents
    .filter((event) => event.trainingSheetPath)
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt))

  const months = new Map()

  sheets.forEach((event) => {
    const weekStart = startOfWeek(event.startAt)
    // Le settimane a cavallo tra due mesi appartengono al mese in cui iniziano.
    const monthKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`
    const weekKey = dateKey(weekStart)

    if (!months.has(monthKey)) {
      months.set(monthKey, {
        key: monthKey,
        date: new Date(weekStart.getFullYear(), weekStart.getMonth(), 1),
        weeks: new Map(),
        count: 0,
      })
    }

    const month = months.get(monthKey)
    if (!month.weeks.has(weekKey)) {
      month.weeks.set(weekKey, {
        key: weekKey,
        start: weekStart,
        items: [],
      })
    }

    month.weeks.get(weekKey).items.push(event)
    month.count += 1
  })

  return Array.from(months.values())
    .sort((a, b) => b.date - a.date)
    .map((month) => ({
      ...month,
      weeks: Array.from(month.weeks.values()).sort((a, b) => b.start - a.start),
    }))
}

function trainingLibraryView() {
  const groups = trainingLibraryGroups()
  const currentWeekKey = dateKey(startOfWeek(new Date()))
  const currentMonthKey = `${startOfWeek(new Date()).getFullYear()}-${String(startOfWeek(new Date()).getMonth() + 1).padStart(2, '0')}`

  return `
    <section class="view page-view training-library-view">
      <div class="page-head training-library-head">
        <div>
          <h1>Training Library</h1>
          <p>Archivio delle Training Sheet della stagione.</p>
        </div>

        ${isOwner()
          ? `
              <button class="primary-action" type="button" data-new-event>
                ${icon('plus')}
                Nuova Training Sheet
              </button>
            `
          : ''}
      </div>

      <div class="library-search-wrap">
        <span class="library-search-icon">${icon('search')}</span>
        <input
          class="library-search"
          type="search"
          placeholder="Cerca per nome, data, tipologia o campo..."
          aria-label="Cerca Training Sheet"
          data-library-search
        >
      </div>

      <div class="training-library" data-library-root>
        ${groups.length
          ? groups.map((month) => {
              const monthTitle = capitalize(new Intl.DateTimeFormat('it-IT', {
                month: 'long',
                year: 'numeric',
              }).format(month.date))
              const monthOpen = month.key === currentMonthKey

              return `
                <details class="library-month" ${monthOpen ? 'open' : ''} data-library-month>
                  <summary>
                    <span class="library-folder-icon">${icon('library')}</span>
                    <strong>${monthTitle}</strong>
                    <span class="library-count">${month.count}</span>
                    <span class="library-chevron">⌄</span>
                  </summary>

                  <div class="library-month-content">
                    ${month.weeks.map((week) => {
                      const weekOpen = week.key === currentWeekKey
                      return `
                        <details class="library-week" ${weekOpen ? 'open' : ''} data-library-week>
                          <summary>
                            <span>
                              <strong>${formatWeekRange(week.start)}</strong>
                              <small>${week.items.length} ${week.items.length === 1 ? 'Training Sheet' : 'Training Sheet'}</small>
                            </span>
                            <span class="library-chevron">⌄</span>
                          </summary>

                          <div class="library-sheet-list">
                            ${week.items.map((event) => {
                              const name = trainingSheetName(event)
                              const searchText = [
                                name,
                                formatSheetDate(event.startAt),
                                sheetTypeLabel(event),
                                event.place || '',
                              ].join(' ').toLocaleLowerCase('it-IT')

                              return `
                                <article class="library-sheet-card" data-library-sheet data-search-text="${searchText.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
                                  <div class="library-sheet-mark">${icon('sheet')}</div>
                                  <div class="library-sheet-main">
                                    <h3>${name}</h3>
                                    <div class="library-sheet-meta">
                                      <span>${formatSheetDate(event.startAt)}</span>
                                      <span>${sheetTypeLabel(event)}</span>
                                      <span>${event.place || 'Campo non indicato'}</span>
                                      <span>Presenti ${event.presentCount ?? '—'}${event.squadTotal ? `/${event.squadTotal}` : ''}</span>
                                    </div>
                                  </div>
                                  <button class="library-open-button" type="button" data-open-event="${event.id}">
                                    Apri
                                  </button>
                                </article>
                              `
                            }).join('')}
                          </div>
                        </details>
                      `
                    }).join('')}
                  </div>
                </details>
              `
            }).join('')
          : `
              <div class="library-empty-state">
                <div>${icon('sheet')}</div>
                <h2>Nessuna Training Sheet</h2>
                <p>Le Training Sheet collegate agli allenamenti compariranno qui automaticamente.</p>
              </div>
            `}
      </div>

      <div class="library-no-results" data-library-no-results hidden>
        Nessuna Training Sheet corrisponde alla ricerca.
      </div>
    </section>
  `
}

function tsEscapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function trainingSheetEditorView() {
  if (!isOwner()) {
    return `
      <section class="view page-view">
        <div class="page-head"><div><h1>Training Sheet Editor</h1><p><span>ACCESSO RISERVATO</span><b>•</b>Solo amministratore</p></div></div>
        <div class="placeholder-panel"><h2>Editor non disponibile</h2><p>Puoi consultare le Training Sheet pubblicate direttamente dal Calendario.</p></div>
      </section>
    `
  }

  const titleCaseName = (value = '') => String(value).toLocaleLowerCase('it-IT').replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('it-IT'))
  const departmentOrder = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante']
  const departmentLabels = { Portiere: 'Portieri', Difensore: 'Difensori', Centrocampista: 'Centrocampisti', Attaccante: 'Attaccanti' }
  const rosterPlayers = players
    .filter((player) => player.name !== 'Andrea Giovannini')
    .map((player) => {
      const cleanName = titleCaseName(player.name)
      const parts = cleanName.trim().split(/\s+/)
      const surname = parts.pop() || ''
      const firstName = parts.join(' ')
      return { ...player, canonicalName: cleanName, displayName: `${firstName} ${surname}`.trim(), surname, department: departmentOrder.includes(player.role) ? player.role : 'Difensore' }
    })
    .sort((a, b) => a.surname.localeCompare(b.surname, 'it', { sensitivity: 'base' }))

  const playerOptions = departmentOrder.map((department) => {
    const rows = rosterPlayers.filter((player) => player.department === department).map((player) => `
      <label class="ts-player-option">
        <input type="checkbox" value="${tsEscapeHtml(player.displayName)}" data-canonical-name="${tsEscapeHtml(player.canonicalName)}">
        <span>${tsEscapeHtml(player.displayName)}</span>
      </label>`).join('')
    return `<div class="ts-roster-department"><strong>${departmentLabels[department]}</strong>${rows}</div>`
  }).join('')

  const editableSheets = calendarEvents
    .filter((event) => event.trainingSheetPath)
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
    .map((event) => {
      const date = new Date(event.startAt).toLocaleDateString('it-IT')
      const code = event.trainingSheetPath.match(/(?:ALL|AL)[_-]?(\d{1,3})/i)?.[1] || ''
      return `<option value="${tsEscapeHtml(event.id)}">${code ? `ALL_${String(code).padStart(3, '0')} · ` : ''}${date} · ${tsEscapeHtml(event.place || 'Campo da definire')}</option>`
    }).join('')

  return `
    <section class="view page-view ts-manual-editor" data-ts-manual-editor>
      <div class="page-head ts-editor-titlebar">
        <div>
          <h1>Training Sheet Editor</h1>
          <p><span>CREAZIONE SEDUTA</span><b>•</b>Compila, controlla l’anteprima e genera il PDF</p>
        </div>
        <div class="ts-editor-actions">
          <label class="ts-open-sheet"><span>Apri Training Sheet</span><select data-open-training-sheet><option value="">Seleziona una TS pubblicata</option>${editableSheets}</select></label>
          <button class="ts-reset-button" type="button" data-reset-training-sheet>Reset editor</button>
          <div class="ts-draft-state" data-ts-draft-state><i></i><span>Bozza pronta</span></div>
        </div>
      </div>

      <div class="ts-workspace">
        <form class="ts-manual-form" data-ts-manual-form>
          <section class="ts-form-card">
            <div class="ts-card-head"><span>01</span><div><h2>Dati seduta</h2><p>Informazioni principali della sessione.</p></div></div>
            <div class="ts-fields-grid ts-session-grid">
              <label class="ts-field"><span>Data</span><div class="ts-input-icon"><i>${icon('calendar')}</i><input name="date" type="date" required></div></label>
              <label class="ts-field"><span>Orario</span><div class="ts-input-icon"><i>${icon('clock')}</i><input name="time" type="time" value="17:30" required></div></label>
              <label class="ts-field ts-field--location"><span>Campo</span><select name="location"><option>Mezzolara</option><option>Budrio</option><option value="__custom__">Altro campo…</option></select></label>
              <label class="ts-field ts-custom-location" data-ts-custom-location hidden><span>Nome campo / impianto</span><input name="custom_location" type="text" maxlength="100" autocomplete="off" placeholder="Scrivi il nome del campo"></label>
              <label class="ts-field"><span>Allenamento n°</span><input name="progressive" type="number" min="1" value="1"><small class="ts-field-help">Proposto automaticamente, modificabile</small></label>
              <label class="ts-field"><span>Presenti</span><input name="present" type="number" min="0" value="28" readonly aria-readonly="true"><small class="ts-field-help">Calcolati automaticamente dalla Rosa</small></label>
            </div>

            <div class="ts-choice-block"><span class="ts-choice-label">Match Day</span><div class="ts-md-selector" data-ts-md-selector>
              ${['MD+1','MD+2','MD+3','MD-3','MD-2','MD-1','MD'].map((md) => `<button type="button" data-md="${md}">${md}</button>`).join('')}
              <input name="match_day" type="hidden">
            </div></div>

            <div class="ts-subsection-title"><span>CARICO</span><small>Focus fisico, intensità e volume</small></div>
            <div class="ts-load-grid">
              <label class="ts-field"><span>Focus fisico</span><select name="focus"><option value="">Seleziona</option><option>Metabolico</option><option>Forza</option><option>Resistenza alla velocità</option><option>Velocità</option></select></label>
              <div class="ts-choice-block"><span class="ts-choice-label">Intensità</span><div class="ts-rating" data-rating="intensity">${[1,2,3,4,5].map(n=>`<button type="button" data-value="${n}">${n}</button>`).join('')}<input name="intensity" type="hidden"></div></div>
              <div class="ts-choice-block"><span class="ts-choice-label">Volume</span><div class="ts-rating" data-rating="volume">${[1,2,3,4,5].map(n=>`<button type="button" data-value="${n}">${n}</button>`).join('')}<input name="volume" type="hidden"></div></div>
            </div>
          </section>

          <section class="ts-form-card">
            <div class="ts-card-head"><span>02</span><div><h2>Disponibilità rosa</h2><p>Seleziona più giocatori dall’elenco.</p></div></div>
            <div class="ts-roster-grid">
              <details class="ts-multiselect" data-player-select="absent"><summary><span>Assenti</span><b data-count>0 selezionati</b></summary><div class="ts-player-options">${playerOptions}</div></details>
              <details class="ts-multiselect is-injured" data-player-select="injured"><summary><span>Infortunati</span><b data-count>0 selezionati</b></summary><div class="ts-player-options">${playerOptions}</div></details>
            </div>
          </section>

          <section class="ts-form-card">
            <div class="ts-card-head"><span>03</span><div><h2>Pilastri</h2><p>Seleziona uno o più riferimenti metodologici.</p></div></div>
            <div class="ts-pillars" data-ts-pillars>
              ${[
                ['create','Creare il vantaggio'],['keep','Conservare il vantaggio'],['exploit','Sfruttare il vantaggio'],['defend','Difendere il vantaggio']
              ].map(([key,label])=>`<label class="ts-pillar ts-pillar--${key}"><input type="checkbox" name="pillars" value="${label}"><span>${label}</span></label>`).join('')}
            </div>
          </section>

          <section class="ts-form-card">
            <div class="ts-card-head"><span>04</span><div><h2>Esercitazioni</h2><p>Descrivi la seduta nell’ordine reale di lavoro.</p></div></div>
            <div class="ts-phases-editor" data-ts-phases></div>
            <button class="ts-add-phase" type="button" data-add-phase>＋ Aggiungi esercitazione</button>
          </section>

          <section class="ts-form-card">
            <div class="ts-card-head"><span>05</span><div><h2>Analisi finale</h2><p>L’analisi propone obiettivo e principi in base alle esercitazioni.</p></div></div>
            <button class="ts-ai-button" type="button" data-analyze-exercises>✦ Analizza esercitazioni</button>
            <p class="ts-ai-note" data-ai-note>Nessuna modifica viene pubblicata automaticamente.</p>
            <label class="ts-field ts-field-full"><span>Obiettivo della seduta</span><textarea name="objective" rows="3" placeholder="Verrà proposto dopo l’analisi oppure puoi scriverlo manualmente."></textarea></label>
            <label class="ts-field ts-field-full"><span>Principi di gioco</span><textarea name="principles" rows="4" placeholder="Verranno proposti dopo l’analisi oppure puoi scriverli manualmente."></textarea></label>
          </section>
        </form>

        <aside class="ts-live-column">
          <div class="ts-preview-toolbar"><div><span>ANTEPRIMA LIVE</span><strong>Training Sheet</strong></div><button type="button" data-print-sheet>${icon('sheet')}<span>Crea PDF</span></button></div>
          <div class="ts-paper-frame"><article class="ts-paper" data-ts-preview></article></div>
          <p class="ts-publish-note" data-publish-note>Il PDF verrà salvato, archiviato e collegato al giorno del Calendario.</p>
        </aside>
      </div>
    </section>
  `
}

function trainingSheetResultHtml(result) {
  const data = result.data
  const absenceRows = [
    ...data.absences.injured.map(name => `<span class="ts-person-chip is-injured">${tsEscapeHtml(name)}</span>`),
    ...data.absences.absent.map(name => `<span class="ts-person-chip">${tsEscapeHtml(name)}</span>`),
  ].join('') || '<span class="ts-muted">Nessun assente riconosciuto</span>'

  const phases = data.phases.map((phase, index) => `
    <article class="ts-phase-card">
      <div class="ts-phase-title"><span>${index + 1}</span><input name="phase_${index}_title" value="${tsEscapeHtml(phase.title)}"></div>
      <div class="ts-phase-fields">
        <label><span>Durata</span><input name="phase_${index}_duration" type="number" min="1" value="${phase.duration_minutes ?? ''}"></label>
        <label><span>Portieri</span><select name="phase_${index}_goalkeepers"><option value="false" ${phase.goalkeepers ? '' : 'selected'}>No</option><option value="true" ${phase.goalkeepers ? 'selected' : ''}>Sì</option></select></label>
      </div>
      <label><span>Descrizione</span><textarea name="phase_${index}_description">${tsEscapeHtml(phase.description)}</textarea></label>
      <label><span>Contenitori</span><input name="phase_${index}_containers" value="${tsEscapeHtml(phase.containers.join(' · '))}"></label>
      ${phase.exercises?.length ? `<div class="ts-exercise-list">${phase.exercises.map(ex => `<div><strong>${tsEscapeHtml(ex.title)}</strong><span>${ex.duration_minutes ?? '—'}'</span></div>`).join('')}</div>` : ''}
    </article>
  `).join('')

  const missing = result.missing_fields.length
    ? `<div class="ts-checks is-warning"><strong>Da completare</strong>${result.missing_fields.map(item => `<span>• ${tsEscapeHtml(item)}</span>`).join('')}</div>`
    : '<div class="ts-checks is-ready"><strong>Seduta completa</strong><span>Tutti i controlli obbligatori sono superati.</span></div>'

  return `
    <div class="ts-summary-grid">
      <label><span>Data</span><input name="date" type="date" value="${data.date ?? ''}"></label>
      <label><span>Orario</span><input name="time" type="time" value="${data.time ?? ''}"></label>
      <label><span>Campo</span><input name="location" value="${tsEscapeHtml(data.location ?? '')}"></label>
      <label><span>Focus fisico</span><input name="focus_physical" value="${tsEscapeHtml(data.focus_physical ?? '')}"></label>
      <label><span>Intensità</span><input name="intensity" type="number" min="1" max="5" value="${data.intensity ?? ''}"></label>
      <label><span>Volume</span><input name="volume" type="number" min="1" max="5" value="${data.volume ?? ''}"></label>
    </div>
    <div class="ts-section-block"><h3>Assenti riconosciuti</h3><div class="ts-person-list">${absenceRows}</div></div>
    <div class="ts-section-block"><div class="ts-section-title"><h3>Fasi</h3><strong>${data.total_duration_minutes ?? '—'} minuti</strong></div><div class="ts-phases">${phases}</div></div>
    <div class="ts-section-block ts-bottom-fields">
      <label><span>Obiettivo della seduta</span><textarea name="objective">${tsEscapeHtml(data.objective ?? '')}</textarea></label>
      <label><span>Principi di gioco</span><input name="principles" value="${tsEscapeHtml(data.principles.join(' · '))}"></label>
    </div>
    ${missing}
    <div class="ts-autosave-row" aria-live="polite"><span class="ts-autosave-dot"></span><span data-ts-save-message>Bozza non ancora sincronizzata.</span></div>
  `
}

function placeholderView(title) {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>${title}</h1>

          <p>
            <span>SEZIONE PRONTA</span>
            <b>•</b>
            Prossima release
          </p>
        </div>
      </div>

      <div class="placeholder-panel">
        <h2>${title}</h2>

        <p>
          La struttura grafica è pronta per essere collegata a
          Supabase.
        </p>
      </div>
    </section>
  `
}

function profileView() {
  const email = currentUserProfile?.email || currentUser?.email || ''
  const firstName = currentUserProfile?.first_name || ''
  const lastName = currentUserProfile?.last_name || ''
  const fullName = profileFullName(currentUserProfile)
  const currentRoleLabel = roleLabel(currentUserRole)

  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Il mio profilo</h1>
          <p><span>ACCOUNT PERSONALE</span><b>•</b>${currentRoleLabel}</p>
        </div>
      </div>

      <div class="profile-page-grid">
        <form class="profile-card" data-profile-form>
          <div class="profile-card-head">
            <span class="profile-page-avatar">${fullName.charAt(0).toUpperCase()}</span>
            <div><h2>Dati personali</h2><p>Aggiorna nome e cognome mostrati nel portale.</p></div>
          </div>
          <div class="profile-name-grid">
            <label class="form-field">
              <span>Nome</span>
              <input name="first_name" value="${firstName}" autocomplete="given-name" required>
            </label>
            <label class="form-field">
              <span>Cognome</span>
              <input name="last_name" value="${lastName}" autocomplete="family-name" required>
            </label>
          </div>
          <label class="form-field">
            <span>Email</span>
            <input value="${email}" type="email" disabled>
          </label>
          <label class="form-field">
            <span>Ruolo</span>
            <input value="${currentRoleLabel}" disabled>
          </label>
          <p class="form-message" data-profile-message></p>
          <button class="primary-action" type="submit">Salva profilo</button>
        </form>

        <form class="profile-card" data-password-form>
          <div class="profile-card-head">
            <div><h2>Cambia password</h2><p>Usa almeno 8 caratteri.</p></div>
          </div>
          <label class="form-field">
            <span>Nuova password</span>
            <input name="password" type="password" minlength="8" autocomplete="new-password" required>
          </label>
          <label class="form-field">
            <span>Conferma nuova password</span>
            <input name="password_confirm" type="password" minlength="8" autocomplete="new-password" required>
          </label>
          <p class="form-message" data-password-message></p>
          <button class="primary-action" type="submit">Aggiorna password</button>
        </form>
      </div>
    </section>
  `
}

function settingsView() {
  return `
    <section class="view page-view settings-view">
      <div class="page-head">
        <div><h1>Impostazioni</h1><p><span>PORTALE</span><b>•</b>Configurazione e accessi</p></div>
      </div>
      <div class="settings-grid">
        ${isOwner() ? `
          <button class="settings-card" type="button" data-open-staff>
            <span class="settings-card-icon">${icon('squad')}</span>
            <span><strong>Gestione Staff</strong><small>Crea, modifica ruoli e gestisci gli accessi.</small></span>
            <b>→</b>
          </button>
        ` : ''}
        <button class="settings-card" type="button" data-open-profile>
          <span class="settings-card-icon">${icon('settings')}</span>
          <span><strong>Il mio profilo</strong><small>Nome, cognome e password personale.</small></span>
          <b>→</b>
        </button>
      </div>
    </section>
  `
}

function staffManagementView() {
  if (!isOwner()) {
    return `
      <section class="view page-view">
        <div class="page-head"><div><h1>Impostazioni</h1></div></div>
        <div class="placeholder-panel"><h2>Accesso riservato</h2><p>Solo l'amministratore può gestire lo staff.</p></div>
      </section>
    `
  }

  const rows = staffProfiles.map((profile) => {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    return `
      <form class="staff-member-card" data-staff-form data-user-id="${profile.id}">
        <div class="staff-member-avatar">${(profile.first_name || profile.email || 'U').charAt(0).toUpperCase()}</div>
        <div class="staff-member-fields">
          <label class="form-field"><span>Nome</span><input name="first_name" value="${profile.first_name || ''}" required></label>
          <label class="form-field"><span>Cognome</span><input name="last_name" value="${profile.last_name || ''}" required></label>
          <label class="form-field staff-email-field"><span>Email</span><input value="${profile.email || ''}" disabled></label>
          <label class="form-field"><span>Ruolo</span>
            <select name="role">
              ${[
                ['owner','Amministratore'], ['coach','Allenatore'], ['assistant','Vice allenatore'],
                ['athletic_coach','Preparatore fisico'], ['goalkeeper_coach','Preparatore portieri'],
                ['analyst','Match analyst'], ['observer','Osservatore'], ['physio','Fisioterapista'],
                ['collaborator','Collaboratore'], ['sporting_director','Direttore sportivo'],
                ['read_only','Solo lettura'],
              ].map(([value,label]) => `<option value="${value}" ${profile.role === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </label>
          <label class="staff-active-toggle"><input name="active" type="checkbox" ${profile.active !== false ? 'checked' : ''}><span>Account attivo</span></label>
        </div>
        <div class="staff-member-actions">
          <span class="staff-member-name">${name || 'Nome da completare'}</span>
          <p class="form-message" data-staff-message></p>
          <button class="primary-action" type="submit">Salva</button>
        </div>
      </form>
    `
  }).join('')

  return `
    <section class="view page-view">
      <div class="page-head">
        <div><h1>Gestione Staff</h1><p><span>AMMINISTRAZIONE</span><b>•</b>Nomi, ruoli e accessi</p></div>
      </div>
      <div class="staff-management-note">
        <strong>Nuovi account</strong>
        <span>Per ora crea l'utente in Supabase Authentication. Comparirà qui automaticamente e potrai completare nome, cognome e ruolo.</span>
      </div>
      <div class="staff-list">${rows || '<div class="placeholder-panel"><p>Nessun profilo disponibile.</p></div>'}</div>
    </section>
  `
}

function trainingSheetPreviewHtml(event) {
  if (!event.trainingSheetUrl) {
    return '<small>Nessuna Training Sheet collegata.</small>'
  }

  const lowerPath = String(
    event.trainingSheetPath ?? '',
  ).toLowerCase()

  if (lowerPath.endsWith('.pdf')) {
    return `
      <iframe
        class="training-sheet-preview training-sheet-preview--pdf"
        src="${event.trainingSheetUrl}#toolbar=0&navpanes=0&scrollbar=1"
        title="Anteprima Training Sheet"
      ></iframe>
    `
  }

  return `
    <img
      class="training-sheet-preview"
      src="${event.trainingSheetUrl}"
      alt="Anteprima Training Sheet"
    >
  `
}

function trainingSheetStructuredHtml(event) {
  const data = event.editorData
  if (!data) return ''
  const phases = Array.isArray(data.phases) ? data.phases : []
  return `
    <section class="drawer-ts-readable">
      <div class="drawer-ts-summary">
        <span><small>Codice</small><b>ALL_${String(data.progressive || '---').padStart(3,'0')}</b></span>
        <span><small>Focus</small><b>${escapeHtml(data.focus || '—')}</b></span>
        <span><small>Presenti</small><b>${escapeHtml(data.present ?? event.presentCount ?? '—')}</b></span>
      </div>
      ${data.pillars?.length ? `<div class="drawer-ts-pillars">${data.pillars.map((pillar)=>`<span>${escapeHtml(pillar)}</span>`).join('')}</div>` : ''}
      <div class="drawer-ts-text"><small>OBIETTIVO</small><p>${escapeHtml(data.objective || 'Da definire')}</p></div>
      <div class="drawer-ts-text"><small>PRINCIPI</small><p>${escapeHtml(data.principles || 'Da definire')}</p></div>
      <div class="drawer-ts-phases">${phases.map((phase,index)=>`<article><header><b>FASE ${index+1}</b><span>${escapeHtml(phase.duration || '—')}'</span></header><strong>${escapeHtml(phase.title || 'Senza titolo')}</strong><p>${escapeHtml(phase.description || '')}</p><small>Portieri: ${phase.goalkeepers==='yes'?'Sì':phase.goalkeepers==='separate'?'Separati':'No'}</small></article>`).join('')}</div>
    </section>`
}

function playerProfileModalHtml(player) {
  const key = playerKey(player.name)
  const saved = playerProfiles[key] || {}
  return `
    <div class="new-event-modal-backdrop player-profile-backdrop" data-close-player-profile>
      <section class="new-event-modal player-profile-modal" role="dialog" aria-modal="true" aria-labelledby="playerProfileTitle">
        <div class="new-event-modal__head"><div><span>SCHEDA GIOCATORE</span><h2 id="playerProfileTitle">${escapeHtml(player.name)}</h2></div><button type="button" class="new-event-modal__close" data-close-player-profile>${icon('close')}</button></div>
        <form class="player-profile-form" data-player-profile-form data-player-key="${key}">
          <div class="player-profile-grid">
            <label class="form-field"><span>Nome e cognome</span><input name="full_name" value="${escapeHtml(saved.full_name || player.name)}" required></label>
            <label class="form-field"><span>Ruolo</span><select name="role">${['Portiere','Difensore','Centrocampista','Attaccante'].map(role=>`<option ${role===(saved.role||player.role)?'selected':''}>${role}</option>`).join('')}</select></label>
            <label class="form-field"><span>Anno di nascita</span><input name="birth_year" inputmode="numeric" value="${escapeHtml(saved.birth_year || player.year || '')}"></label>
            <label class="form-field"><span>Piede preferito</span><select name="preferred_foot"><option value="">Da definire</option><option value="DX" ${(saved.preferred_foot||player.foot)==='DX'?'selected':''}>Destro</option><option value="SX" ${(saved.preferred_foot||player.foot)==='SX'?'selected':''}>Sinistro</option><option value="AMB" ${saved.preferred_foot==='AMB'?'selected':''}>Ambidestro</option></select></label>
            <label class="form-field"><span>Altezza (cm)</span><input name="height_cm" type="number" min="120" max="230" value="${escapeHtml(saved.height_cm || '')}"></label>
            <label class="form-field"><span>Peso (kg)</span><input name="weight_kg" type="number" min="35" max="180" step="0.1" value="${escapeHtml(saved.weight_kg || '')}"></label>
            <label class="form-field"><span>Telefono</span><input name="phone" type="tel" value="${escapeHtml(saved.phone || '')}"></label>
            <label class="form-field"><span>Email</span><input name="email" type="email" value="${escapeHtml(saved.email || '')}"></label>
          </div>
          <div class="player-profile-notes-grid">
            <label class="form-field"><span>Note tecniche</span><textarea name="technical_notes" rows="4">${escapeHtml(saved.technical_notes || '')}</textarea></label>
            <label class="form-field"><span>Note infortuni</span><textarea name="injury_notes" rows="4">${escapeHtml(saved.injury_notes || '')}</textarea></label>
          </div>
          <p class="form-message" data-player-profile-message></p>
          <div class="modal-actions"><button type="button" class="ghost-button" data-close-player-profile>Annulla</button><button type="submit" class="primary-action">Salva scheda</button></div>
        </form>
      </section>
    </div>`
}

function drawerHtml(event) {
  const eventDate = new Date(event.startAt)
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(eventDate)

  return `
    <div class="drawer-backdrop" data-close-drawer></div>

    <aside class="event-drawer">
      <div class="drawer-head">
        <div>
          <span class="event-type-badge event-type-badge--${event.type}">
            ${eventTypeIcon(event.type)}
            ${event.title.toUpperCase()}
          </span>
          <h2 class="drawer-event-date">${formattedDate}</h2>
          <time class="drawer-event-time">${event.time}</time>
        </div>

        <button type="button" data-close-drawer aria-label="Chiudi">
          ${icon('close')}
        </button>
      </div>

      <div class="drawer-section">
        <div class="event-info-grid">
          <div class="event-info-card">
            <span>Campo</span>
            <strong class="event-info-card__value">
              <i class="event-info-card__icon">${icon('location')}</i>
              ${event.place || 'Non indicato'}
            </strong>
          </div>

          ${event.type === 'match' && event.matchType ? `
                <div class="event-info-card">
                  <span>Tipo partita</span>
                  <strong class="event-info-card__value">${escapeHtml(matchTypeLabel(event.matchType))}</strong>
                </div>` : ''}

          ${event.type === 'match' && event.opponent ? `
                <div class="event-info-card">
                  <span>Avversario</span>
                  <strong class="event-info-card__value">${escapeHtml(event.opponent)}</strong>
                </div>` : ''}

          ${isTrainingEventType(event.type)
            ? `
                <div class="event-info-card">
                  <span>Match Day</span>
                  <strong class="event-info-card__value">${event.matchDay || 'Nessuno'}</strong>
                </div>
              `
            : ''}
        </div>
      </div>

      ${isTrainingEventType(event.type)
        ? `
            <div class="drawer-section">
              <label>Training Sheet</label>

              <div class="training-sheet-meta">
                <div><span>Data</span><strong>${eventDate.toLocaleDateString('it-IT')}</strong></div>
                <div><span>Ora</span><strong>${event.time}</strong></div>
                <div><span>Campo</span><strong>${event.place || 'Non indicato'}</strong></div>
                <div><span>Match Day</span><strong>${event.matchDay || 'Nessuno'}</strong></div>
                <div><span>Presenti</span><strong>${event.presentCount ?? '—'}${event.squadTotal ? `/${event.squadTotal}` : ''}</strong></div>
              </div>

              ${trainingSheetStructuredHtml(event)}
              <div class="training-sheet-preview-wrap">
                ${trainingSheetPreviewHtml(event)}
              </div>

              ${isOwner() ? `
                <div class="drawer-ts-owner-actions">
                  ${event.editorData ? `<button class="wide-button" type="button" data-edit-training-sheet="${event.id}">${icon('sheet')} Modifica nel TS Editor</button>` : ''}
                  ${event.trainingSheetUrl ? `<a class="wide-button drawer-sheet-link" href="${event.trainingSheetUrl}" target="_blank" rel="noopener noreferrer"><span class="drawer-sheet-link__icon">${icon('sheet')}</span><span>Apri PDF</span></a>` : ''}
                </div>` : ''}
            </div>
          `
        : ''}

      ${isOwner()
        ? `
            <div class="drawer-actions">
              <button
                type="button"
                data-edit-event="${event.id}"
              >
                Modifica evento
              </button>

              <button
                class="drawer-delete-button"
                type="button"
                data-delete-event="${event.id}"
              >
                Elimina evento
              </button>
            </div>
          `
        : ''}
    </aside>
  `
}

function newEventModalHtml(selectedDate = formatDateInputValue(new Date())) {
  const today = selectedDate

  return `
    <div class="new-event-modal-backdrop" data-close-new-event>
      <section
        class="new-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newEventTitle"
      >
        <div class="new-event-modal__head">
          <div>
            <span>CALENDARIO</span>
            <h2 id="newEventTitle">Nuovo evento</h2>
          </div>

          <button
            class="new-event-modal__close"
            type="button"
            data-close-new-event
            aria-label="Chiudi"
          >
            ${icon('close')}
          </button>
        </div>

        <form id="newEventForm" class="new-event-form">
          <label>
            Tipo evento
            <select name="eventType" required>
              <option value="training">Allenamento</option>
              <option value="match">Partita</option>
              <option value="meeting">Riunione</option>
              <option value="rest">Riposo</option>
            </select>
          </label>

          <div data-match-fields hidden>
            <label>
              Tipo partita
              <select name="matchType">
                <option value="friendly">Amichevole</option>
                <option value="cup">Coppa</option>
                <option value="league">Campionato</option>
              </select>
            </label>
            <label>
              Avversario
              <input name="opponent" type="text" maxlength="80" autocomplete="off" value="Da definire" placeholder="Nome squadra avversaria">
            </label>
          </div>

          <div class="new-event-form__row">
            <label>
              Data
              <input name="date" type="date" value="${today}" required>
            </label>

            <label>
              Ora
              <input name="time" type="time" value="17:30" required>
            </label>
          </div>

          <label>
            Campo
            <select name="location" required>
              <option value="Mezzolara">Mezzolara</option>
              <option value="Budrio">Budrio</option>
              <option value="__custom__">Altro campo…</option>
            </select>
          </label>

          <label data-custom-location hidden>
            Nome campo / impianto
            <input name="customLocation" type="text" maxlength="100" autocomplete="off" placeholder="Scrivi il nome del campo">
          </label>

          <label data-md-field>
            MD
            <select name="matchDay">
              <option value="">Nessuno</option>
              <option value="MD">MD</option>
              <option value="MD-1">MD-1</option>
              <option value="MD-2">MD-2</option>
              <option value="MD-3">MD-3</option>
              <option value="MD+1">MD+1</option>
              <option value="MD+2">MD+2</option>
              <option value="MD+3">MD+3</option>
            </select>
          </label>

          <label data-training-sheet-field>
            Training Sheet
            <input
              name="trainingSheet"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
            >
            <small>
              Facoltativa. Puoi allegarla subito oppure aggiungerla in seguito.
            </small>
          </label>

          <p
            id="newEventMessage"
            class="new-event-form__message"
            aria-live="polite"
          ></p>

          <div class="new-event-modal__actions">
            <button
              class="new-event-modal__secondary"
              type="button"
              data-close-new-event
            >
              Annulla
            </button>

            <button
              id="saveNewEventButton"
              class="primary-action"
              type="submit"
            >
              Salva evento
            </button>
          </div>
        </form>
      </section>
    </div>
  `
}

function editEventModalHtml(event) {
  const localDate = new Date(event.startAt)
  const date = formatDateInputValue(localDate)
  const time = localDate.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
    <div class="new-event-modal-backdrop" data-close-new-event>
      <section
        class="new-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editEventTitle"
      >
        <div class="new-event-modal__head">
          <div>
            <span>CALENDARIO</span>
            <h2 id="editEventTitle">Modifica evento</h2>
          </div>

          <button
            class="new-event-modal__close"
            type="button"
            data-close-new-event
            aria-label="Chiudi"
          >
            ${icon('close')}
          </button>
        </div>

        <form id="editEventForm" class="new-event-form">
          <input name="eventId" type="hidden" value="${event.id}">

          <label>
            Tipo evento
            <select name="eventType" required>
              <option value="training" ${event.type === 'training' ? 'selected' : ''}>
                Allenamento
              </option>
              <option value="match" ${event.type === 'match' ? 'selected' : ''}>
                Partita
              </option>
              <option value="meeting" ${event.type === 'meeting' ? 'selected' : ''}>
                Riunione
              </option>
              <option value="rest" ${event.type === 'rest' ? 'selected' : ''}>
                Riposo
              </option>
            </select>
          </label>

          <div data-match-fields ${event.type === 'match' ? '' : 'hidden'}>
            <label>
              Tipo partita
              <select name="matchType">
                <option value="friendly" ${event.matchType === 'friendly' ? 'selected' : ''}>Amichevole</option>
                <option value="cup" ${event.matchType === 'cup' ? 'selected' : ''}>Coppa</option>
                <option value="league" ${event.matchType === 'league' ? 'selected' : ''}>Campionato</option>
              </select>
            </label>
            <label>
              Avversario
              <input name="opponent" type="text" maxlength="80" autocomplete="off" value="${escapeHtml(event.opponent || 'Da definire')}" placeholder="Nome squadra avversaria">
            </label>
          </div>

          <div class="new-event-form__row">
            <label>
              Data
              <input name="date" type="date" value="${date}" required>
            </label>

            <label>
              Ora
              <input name="time" type="time" value="${time}" required>
            </label>
          </div>

          <label>
            Campo
            <select name="location" required>
              <option value="Mezzolara" ${event.place === 'Mezzolara' ? 'selected' : ''}>Mezzolara</option>
              <option value="Budrio" ${event.place === 'Budrio' ? 'selected' : ''}>Budrio</option>
              <option value="__custom__" ${event.place && !['Mezzolara','Budrio'].includes(event.place) ? 'selected' : ''}>Altro campo…</option>
            </select>
          </label>

          <label data-custom-location ${event.place && !['Mezzolara','Budrio'].includes(event.place) ? '' : 'hidden'}>
            Nome campo / impianto
            <input name="customLocation" type="text" maxlength="100" autocomplete="off" value="${event.place && !['Mezzolara','Budrio'].includes(event.place) ? escapeHtml(event.place) : ''}" placeholder="Scrivi il nome del campo">
          </label>

          <label data-md-field ${isTrainingEventType(event.type) ? '' : 'hidden'}>
            MD
            <select name="matchDay">
              <option value="" ${!event.matchDay ? 'selected' : ''}>Nessuno</option>
              <option value="MD" ${event.matchDay === 'MD' ? 'selected' : ''}>MD</option>
              <option value="MD-1" ${event.matchDay === 'MD-1' ? 'selected' : ''}>MD-1</option>
              <option value="MD-2" ${event.matchDay === 'MD-2' ? 'selected' : ''}>MD-2</option>
              <option value="MD-3" ${event.matchDay === 'MD-3' ? 'selected' : ''}>MD-3</option>
              <option value="MD+1" ${event.matchDay === 'MD+1' ? 'selected' : ''}>MD+1</option>
              <option value="MD+2" ${event.matchDay === 'MD+2' ? 'selected' : ''}>MD+2</option>
              <option value="MD+3" ${event.matchDay === 'MD+3' ? 'selected' : ''}>MD+3</option>
            </select>
          </label>

          <label
            data-training-sheet-field
            ${isTrainingEventType(event.type) ? '' : 'hidden'}
          >
            Sostituisci Training Sheet
            <input
              name="trainingSheet"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
            >
            <small>
              Lascia vuoto per mantenere il file attuale.
            </small>
          </label>

          <p
            id="newEventMessage"
            class="new-event-form__message"
            aria-live="polite"
          ></p>

          <div class="new-event-modal__actions">
            <button
              class="new-event-modal__secondary"
              type="button"
              data-close-new-event
            >
              Annulla
            </button>

            <button
              id="saveNewEventButton"
              class="primary-action"
              type="submit"
            >
              Salva modifiche
            </button>
          </div>
        </form>
      </section>
    </div>
  `
}

function profileMenuHtml(userInitial, userEmail, userName, roleLabel) {
  return `
    <div class="profile-menu-wrapper">
      <button
        id="profileMenuButton"
        class="profile-menu-button"
        type="button"
        aria-expanded="false"
        aria-controls="profileDropdown"
        aria-label="Apri menu profilo"
      >
        <span class="user-avatar" aria-hidden="true">
          <span class="avatar-initial">${userInitial}</span>
        </span>

        <span class="profile-menu-identity">
          <strong>${userName}</strong>
          <small>${roleLabel}</small>
        </span>

        <span
          class="profile-menu-chevron"
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      <div
        id="profileDropdown"
        class="profile-dropdown"
        role="menu"
        aria-hidden="true"
      >
        <div class="profile-dropdown-head">
          <span class="profile-dropdown-avatar" aria-hidden="true">
            <span class="avatar-initial">${userInitial}</span>
          </span>

          <div>
            <strong>${userName}</strong>
            <span>${userEmail}</span>
          </div>
        </div>

        <div class="profile-dropdown-separator"></div>

        <button
          class="profile-dropdown-item"
          type="button"
          data-profile-action="profile"
          role="menuitem"
        >
          <span class="profile-dropdown-icon">
            ${icon('squad')}
          </span>

          <span>Profilo</span>
        </button>

        <div class="profile-dropdown-separator"></div>

        <button
          id="logoutButton"
          class="profile-dropdown-item profile-dropdown-item--logout"
          type="button"
          data-profile-action="logout"
          role="menuitem"
        >
          <span class="profile-dropdown-icon">
            ${icon('logout')}
          </span>

          <span>Esci</span>
        </button>
      </div>
    </div>
  `
}

export function renderApp(user) {
  currentUser = user
  const userEmail = user.email ?? ''
  const emailLocalPart = userEmail.split('@')[0] || 'Utente'
  const fallbackUserName = emailLocalPart
    .replace(/\d+$/g, '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  const knownProfiles = {
    'nicola.zecchi83@gmail.com': { name: 'Nicola Zecchi', role: 'Amministratore' },
    'lorenzopalmieri@alice.it': { name: 'Lorenzo Palmieri', role: 'Vice allenatore' },
    'lorenzo.palmieri@alice.it': { name: 'Lorenzo Palmieri', role: 'Vice allenatore' },
    'maurizioaldrovandi@alice.it': { name: 'Maurizio Aldrovandi', role: 'Preparatore portieri' },
    'maurizio.aldrovandi@alice.it': { name: 'Maurizio Aldrovandi', role: 'Preparatore portieri' },
    'luca0276@hotmail.it': { name: 'Luca Platti', role: 'Preparatore fisico' },
    'mari.flycom@gmail.com': { name: 'Matteo Mari', role: 'Direttore sportivo' },
  }
  const knownProfile = knownProfiles[userEmail.toLowerCase()]
  const userName = knownProfile?.name || user.user_metadata?.full_name || user.user_metadata?.name || fallbackUserName || 'Utente'
  const currentRoleLabel = knownProfile?.role || 'Staff'
  const userInitial = userName.charAt(0).toUpperCase() || 'N'

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-square">
            NZ
          </div>

          <div>
            <strong>NICOLA ZECCHI</strong>
            <span>STAFF</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${menuHtml()}
        </nav>

      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="mobile-topbar-brand">
            <span class="mobile-brand-square">
              NZ
            </span>

            <div>
              <strong>NICOLA ZECCHI</strong>
              <span>STAFF</span>
            </div>
          </div>

          ${profileMenuHtml(userInitial, userEmail, userName, currentRoleLabel)}
        </header>

        <main id="viewRoot">
          ${dashboardView()}
        </main>
      </div>

      <div id="drawerRoot"></div>
      <div id="modalRoot"></div>
    </div>
  `
}

function normalizeCsvHeader(value) {
  return String(value ?? '').trim().toLocaleLowerCase('it-IT')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i += 1 }
      else if (char === '"') quoted = false
      else value += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(value); value = '' }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = '' }
    else value += char
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row) }
  return rows
}

function parseItalianDate(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/)
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

export async function attachAppEvents(user) {
  currentUser = user
  await loadCurrentUserRole(user)
  syncProfileHeader()
  await loadCalendarEvents()
  await loadPlayerProfiles()
  
  const root = document.querySelector('#viewRoot')
  const drawerRoot = document.querySelector('#drawerRoot')
  const modalRoot = document.querySelector('#modalRoot')

  const logoutButton =
    document.querySelector('#logoutButton')

  const profileMenuButton =
    document.querySelector('#profileMenuButton')

  const profileDropdown =
    document.querySelector('#profileDropdown')

  function setActiveNavigation(sectionKey) {
    document
      .querySelectorAll('.nav-item')
      .forEach((item) => {
        item.classList.toggle(
          'is-active',
          item.dataset.section === sectionKey,
        )
      })
  }

 async function setView(key, label) {
  closeDrawer()
  closeNewEventModal()
  document.body.classList.remove('drawer-open', 'new-event-modal-open')
  document.body.style.removeProperty('overflow')

  if (key === 'calendar' || key === 'dashboard' || key === 'library' || key === 'training-sheet') {
    await loadCalendarEvents()
  }

  if (key === 'staff') {
    await loadStaffProfiles()
  }

  if (key === 'analysis') {
    await loadAnalysisEntries()
  }

  if (key === 'squad') {
    await loadPlayerProfiles()
  }

  const views = {
    dashboard: dashboardView,
    calendar: calendarView,
    'training-sheet': trainingSheetEditorView,
    library: trainingLibraryView,
    squad: squadView,
    analysis: analysisView,
    profile: profileView,
    settings: settingsView,
    staff: staffManagementView,
  }

  root.innerHTML = views[key]
    ? views[key]()
    : placeholderView(label)

  await bindDynamic()

  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  root.scrollTop = 0
  root.closest('.workspace')?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
}

  function closeNewEventModal() {
    if (!modalRoot) {
      return
    }

    modalRoot.innerHTML = ''
    document.body.classList.remove('new-event-modal-open')
  }

  function bindEventTypeFields(form) {
    const typeSelect = form?.querySelector('[name="eventType"]')
    const trainingSheetField = form?.querySelector('[data-training-sheet-field]')
    const trainingSheetInput = form?.querySelector('[name="trainingSheet"]')
    const mdField = form?.querySelector('[data-md-field]')
    const mdSelect = form?.querySelector('[name="matchDay"]')
    const matchFields = form?.querySelector('[data-match-fields]')
    const matchTypeSelect = form?.querySelector('[name="matchType"]')
    const opponentInput = form?.querySelector('[name="opponent"]')
    const locationSelect = form?.querySelector('[name="location"]')
    const customLocationField = form?.querySelector('[data-custom-location]')
    const customLocationInput = form?.querySelector('[name="customLocation"]')

    if (!typeSelect || !trainingSheetField) return

    const refreshLocation = () => {
      const isCustom = locationSelect?.value === '__custom__'
      if (customLocationField) customLocationField.hidden = !isCustom
      if (customLocationInput) {
        customLocationInput.required = Boolean(isCustom)
        if (!isCustom) customLocationInput.value = ''
      }
    }

    const refresh = () => {
      const showTrainingSheet = isTrainingEventType(typeSelect.value)
      trainingSheetField.hidden = !showTrainingSheet
      if (mdField) mdField.hidden = !showTrainingSheet
      const showMatchType = typeSelect.value === 'match'
      if (matchFields) matchFields.hidden = !showMatchType
      if (!showMatchType && matchTypeSelect) matchTypeSelect.value = 'friendly'
      if (!showMatchType && opponentInput) opponentInput.value = ''

      if (!showTrainingSheet && trainingSheetInput) {
        trainingSheetInput.value = ''
      }

      if (!showTrainingSheet && mdSelect) {
        mdSelect.value = ''
      }
    }

    typeSelect.addEventListener('change', refresh)
    locationSelect?.addEventListener('change', refreshLocation)
    refresh()
    refreshLocation()
  }

  function enableDateTimePickers(form) {
    form?.querySelectorAll('input[type="date"], input[type="time"]').forEach((input) => {
      input.readOnly = false
      input.disabled = false
      input.addEventListener('click', () => {
        if (typeof input.showPicker === 'function') {
          try { input.showPicker() } catch (_) {}
        }
      })
    })
  }

  function openNewEventModal(selectedDate) {
    if (!isOwner()) return
    if (!modalRoot) {
      return
    }

    modalRoot.innerHTML = newEventModalHtml(selectedDate)
    document.body.classList.add('new-event-modal-open')

    const backdrop = modalRoot.querySelector(
      '.new-event-modal-backdrop',
    )
    const form = modalRoot.querySelector('#newEventForm')
    const message = modalRoot.querySelector('#newEventMessage')
    const saveButton = modalRoot.querySelector(
      '#saveNewEventButton',
    )

    bindEventTypeFields(form)
    enableDateTimePickers(form)

    modalRoot
      .querySelectorAll('[data-close-new-event]')
      .forEach((element) => {
        element.addEventListener('click', (event) => {
          if (
            element === backdrop &&
            event.target !== backdrop
          ) {
            return
          }

          closeNewEventModal()
        })
      })

    form?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const formData = new FormData(form)
      const eventType = String(
        formData.get('eventType') ?? 'training',
      )
      const date = formData.get('date')
      const time = formData.get('time')
      const locationChoice = String(formData.get('location') ?? '').trim()
      const customLocation = String(formData.get('customLocation') ?? '').trim()
      const location = locationChoice === '__custom__' ? customLocation : locationChoice
      const file = formData.get('trainingSheet')
      const matchType = eventType === 'match' ? String(formData.get('matchType') || 'friendly') : null
      const opponent = eventType === 'match' ? String(formData.get('opponent') || '').trim() : ''
      const matchDay = isTrainingEventType(eventType)
        ? String(formData.get('matchDay') ?? '').trim() || null
        : null
      const presentCount = null
      const squadTotal = null

      if (eventType === 'match' && !opponent) {
        message.textContent = 'Inserisci il nome della squadra avversaria.'
        return
      }

      if (!date || !time || !location) {
        message.textContent = 'Inserisci data, ora e campo.'
        return
      }

      saveButton.disabled = true
      saveButton.textContent = 'Salvataggio...'
      message.textContent = ''

      const eventTitle = buildEventTitle(eventType, matchType, opponent)

      let filePath = null

      if (
        isTrainingEventType(eventType) &&
        file instanceof File &&
        file.size > 0
      ) {
        const safeName = file.name
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '-')

        filePath =
          `${date}/${crypto.randomUUID()}-${safeName}`

        const { error: uploadError } =
          await supabase.storage
            .from('training-sheets')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

        if (uploadError) {
          message.textContent =
            `Errore caricamento: ${uploadError.message}`
          saveButton.disabled = false
          saveButton.textContent = 'Salva evento'
          return
        }
      }

      const startAt = new Date(
        `${date}T${time}:00`,
      ).toISOString()

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title: eventTitle,
          event_type: eventType,
          start_at: startAt,
          location: location || null,
          match_day: matchDay,
          present_count: presentCount,
          squad_total: squadTotal,
          training_sheet_path: filePath,
        })

      if (insertError) {
        if (filePath) {
          await supabase.storage
            .from('training-sheets')
            .remove([filePath])
        }

        message.textContent =
          `Errore salvataggio: ${insertError.message}`
        saveButton.disabled = false
        saveButton.textContent = 'Salva evento'
        return
      }

      closeNewEventModal()
      await loadCalendarEvents()
      root.innerHTML = calendarView()
      bindDynamic()
    })
  }

  async function uploadTrainingSheet(file, date) {
    if (!(file instanceof File) || file.size === 0) {
      return {
        filePath: null,
        error: null,
      }
    }

    const safeName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')

    const filePath =
      `${date}/${crypto.randomUUID()}-${safeName}`

    const { error } = await supabase.storage
      .from('training-sheets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    return {
      filePath,
      error,
    }
  }

  function openEditEventModal(eventId) {
    if (!isOwner()) return
    const currentEvent = calendarEvents.find(
      (item) => String(item.id) === String(eventId),
    )

    if (!currentEvent || !modalRoot) {
      return
    }

    modalRoot.innerHTML = editEventModalHtml(currentEvent)
    document.body.classList.add('new-event-modal-open')

    const backdrop = modalRoot.querySelector(
      '.new-event-modal-backdrop',
    )
    const form = modalRoot.querySelector('#editEventForm')
    const message = modalRoot.querySelector('#newEventMessage')
    const saveButton = modalRoot.querySelector(
      '#saveNewEventButton',
    )

    bindEventTypeFields(form)
    enableDateTimePickers(form)

    modalRoot
      .querySelectorAll('[data-close-new-event]')
      .forEach((element) => {
        element.addEventListener('click', (clickEvent) => {
          if (
            element === backdrop &&
            clickEvent.target !== backdrop
          ) {
            return
          }

          closeNewEventModal()
        })
      })

    form?.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault()

      const formData = new FormData(form)
      const eventType = String(
        formData.get('eventType') ?? 'training',
      )
      const date = formData.get('date')
      const time = formData.get('time')
      const locationChoice = String(formData.get('location') ?? '').trim()
      const customLocation = String(formData.get('customLocation') ?? '').trim()
      const location = locationChoice === '__custom__' ? customLocation : locationChoice
      const file = formData.get('trainingSheet')
      const matchType = eventType === 'match' ? String(formData.get('matchType') || 'friendly') : null
      const opponent = eventType === 'match' ? String(formData.get('opponent') || '').trim() : ''
      const matchDay = isTrainingEventType(eventType)
        ? String(formData.get('matchDay') ?? '').trim() || null
        : null
      const presentCount = null
      const squadTotal = null

      if (eventType === 'match' && !opponent) {
        message.textContent = 'Inserisci il nome della squadra avversaria.'
        return
      }

      if (!date || !time || !location) {
        message.textContent = 'Inserisci data, ora e campo.'
        return
      }

      saveButton.disabled = true
      saveButton.textContent = 'Salvataggio...'
      message.textContent = ''

      const eventTitle = buildEventTitle(eventType, matchType, opponent)

      let nextFilePath = isTrainingEventType(eventType)
        ? currentEvent.trainingSheetPath
        : null

      if (
        isTrainingEventType(eventType) &&
        file instanceof File &&
        file.size > 0
      ) {
        const uploadResult = await uploadTrainingSheet(
          file,
          String(date),
        )

        if (uploadResult.error) {
          message.textContent =
            `Errore caricamento: ${uploadResult.error.message}`
          saveButton.disabled = false
          saveButton.textContent = 'Salva modifiche'
          return
        }

        nextFilePath = uploadResult.filePath
      }

      const startAt = new Date(
        `${date}T${time}:00`,
      ).toISOString()

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: eventTitle,
          event_type: eventType,
          start_at: startAt,
          location: location || null,
          match_day: matchDay,
          present_count: presentCount,
          squad_total: squadTotal,
          training_sheet_path: nextFilePath,
          ...(isTrainingEventType(eventType) && currentEvent.rawNotes !== null
            ? { notes: currentEvent.rawNotes }
            : {}),
        })
        .eq('id', currentEvent.id)

      if (updateError) {
        if (
          nextFilePath &&
          nextFilePath !== currentEvent.trainingSheetPath
        ) {
          await supabase.storage
            .from('training-sheets')
            .remove([nextFilePath])
        }

        message.textContent =
          `Errore modifica: ${updateError.message}`
        saveButton.disabled = false
        saveButton.textContent = 'Salva modifiche'
        return
      }

      if (
        currentEvent.trainingSheetPath &&
        nextFilePath !== currentEvent.trainingSheetPath
      ) {
        await supabase.storage
          .from('training-sheets')
          .remove([currentEvent.trainingSheetPath])
      }

      closeNewEventModal()
      await loadCalendarEvents()
      root.innerHTML = calendarView()
      bindDynamic()
    })
  }

  async function deleteEvent(eventId) {
    if (!isOwner()) return
    const currentEvent = calendarEvents.find(
      (item) => String(item.id) === String(eventId),
    )

    if (!currentEvent) {
      return
    }

    const confirmed = window.confirm(
      `Eliminare "${currentEvent.title}" del ${new Date(
        currentEvent.startAt,
      ).toLocaleDateString('it-IT')}?`,
    )

    if (!confirmed) {
      return
    }

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', currentEvent.id)

    if (deleteError) {
      alert(`Errore eliminazione: ${deleteError.message}`)
      return
    }

    if (currentEvent.trainingSheetPath) {
      await supabase.storage
        .from('training-sheets')
        .remove([currentEvent.trainingSheetPath])
    }

    closeDrawer()
    await loadCalendarEvents()
    root.innerHTML = calendarView()
    bindDynamic()
  }

  function openDrawer(eventId) {
    const event = calendarEvents.find(
      (item) => String(item.id) === String(eventId),
    )

    if (!event) {
      return
    }

    drawerRoot.innerHTML = drawerHtml(event)

    document.body.classList.add('drawer-open')

    drawerRoot
      .querySelectorAll('[data-close-drawer]')
      .forEach((element) => {
        element.addEventListener('click', closeDrawer)
      })

    drawerRoot
      .querySelector('[data-edit-event]')
      ?.addEventListener('click', () => {
        closeDrawer()
        openEditEventModal(event.id)
      })

    drawerRoot
      .querySelector('[data-delete-event]')
      ?.addEventListener('click', async () => {
        await deleteEvent(event.id)
      })

    drawerRoot
      .querySelector('[data-edit-training-sheet]')
      ?.addEventListener('click', async () => {
        if (!event.editorData) return
        localStorage.setItem('nz-training-sheet-editor-v6-2', JSON.stringify(event.editorData))
        localStorage.setItem('nz-active-section', 'training-sheet')
        closeDrawer()
        setActiveNavigation('training-sheet')
        await setView('training-sheet', 'Training Sheet Editor')
      })
  }

  function closeDrawer() {
    drawerRoot.innerHTML = ''
    document.body.classList.remove('drawer-open')
  }

  function openProfileMenu() {
    if (!profileMenuButton || !profileDropdown) {
      return
    }

    profileMenuButton.setAttribute(
      'aria-expanded',
      'true',
    )

    profileDropdown.setAttribute(
      'aria-hidden',
      'false',
    )

    profileDropdown.classList.add('is-open')
    document.body.classList.add('profile-menu-open')
  }

  function closeProfileMenu() {
    if (!profileMenuButton || !profileDropdown) {
      return
    }

    profileMenuButton.setAttribute(
      'aria-expanded',
      'false',
    )

    profileDropdown.setAttribute(
      'aria-hidden',
      'true',
    )

    profileDropdown.classList.remove('is-open')
    document.body.classList.remove('profile-menu-open')
  }

  function toggleProfileMenu() {
    const isOpen =
      profileDropdown?.classList.contains('is-open')

    if (isOpen) {
      closeProfileMenu()
      return
    }

    openProfileMenu()
  }

  async function bindDynamic() {
    const manualEditor = root.querySelector('[data-ts-manual-editor]')
    if (manualEditor) {
      const form = manualEditor.querySelector('[data-ts-manual-form]')
      const preview = manualEditor.querySelector('[data-ts-preview]')
      const phasesRoot = manualEditor.querySelector('[data-ts-phases]')
      const draftState = manualEditor.querySelector('[data-ts-draft-state] span')
      const tsLocationSelect = form?.elements.location
      const tsCustomLocationField = manualEditor.querySelector('[data-ts-custom-location]')
      const tsCustomLocationInput = form?.elements.custom_location
      const syncTsLocation = () => {
        const isCustom = tsLocationSelect?.value === '__custom__'
        if (tsCustomLocationField) tsCustomLocationField.hidden = !isCustom
        if (tsCustomLocationInput) {
          tsCustomLocationInput.required = Boolean(isCustom)
          if (!isCustom) tsCustomLocationInput.value = ''
        }
      }
      tsLocationSelect?.addEventListener('change', syncTsLocation)
      syncTsLocation()
      const storageKey = 'nz-training-sheet-editor-v6-2'
      let phaseCount = 0
      let saveTimer = null

      const escape = (value='') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]))
      const selectedPlayers = (type) => [...manualEditor.querySelectorAll(`[data-player-select="${type}"] input:checked`)].map(input => input.value)
      const selectedPillars = () => [...form.querySelectorAll('[name="pillars"]:checked')].map(input => input.value)
      const squadTotal = 0 || players.length
      const updatePresentCount = () => {
        const unavailable = new Set([...selectedPlayers('absent'), ...selectedPlayers('injured')])
        const present = Math.max(0, squadTotal - unavailable.size)
        if (form.elements.present) form.elements.present.value = String(present)
        return present
      }

      const addPhase = (data = {}) => {
        const index = phaseCount++
        phasesRoot.insertAdjacentHTML('beforeend', `
          <article class="ts-phase-editor" data-phase>
            <div class="ts-phase-editor-head"><strong>FASE ${index + 1}</strong><button type="button" data-remove-phase aria-label="Rimuovi">×</button></div>
            <div class="ts-phase-compact">
              <label class="ts-field"><span>Titolo</span><input name="phase_title_${index}" value="${escape(data.title || '')}" placeholder="Es. Attivazione, Gioco di posizione, Possesso"></label>
              <label class="ts-field"><span>Durata</span><input name="phase_duration_${index}" type="number" min="1" value="${escape(data.duration || '')}" placeholder="10"></label>
              <label class="ts-field"><span>Portieri</span><select name="phase_goalkeepers_${index}"><option value="no" ${(!data.goalkeepers || data.goalkeepers==='no')?'selected':''}>No</option><option value="yes" ${data.goalkeepers==='yes'?'selected':''}>Sì</option><option value="separate" ${data.goalkeepers==='separate'?'selected':''}>Lavoro separato</option></select></label>
            </div>
            <label class="ts-field ts-field-full"><span>Descrizione esercitazione</span><textarea name="phase_description_${index}" rows="4" placeholder="Organizzazione, numeri, spazi, regole e obiettivi...">${escape(data.description || '')}</textarea></label>
            <div class="ts-phase-compact two">
              <label class="ts-field"><span>Varianti</span><textarea name="phase_variants_${index}" rows="2">${escape(data.variants || '')}</textarea></label>
              <label class="ts-field"><span>Coaching point</span><textarea name="phase_coaching_${index}" rows="2">${escape(data.coaching || '')}</textarea></label>
            </div>
          </article>
        `)
        phasesRoot.lastElementChild.querySelector('[data-remove-phase]').addEventListener('click', (event) => {
          event.currentTarget.closest('[data-phase]').remove(); updatePreview(); scheduleSave()
        })
      }

      const collect = () => {
        const fd = new FormData(form)
        const phases = [...phasesRoot.querySelectorAll('[data-phase]')].map((node) => {
          const title = node.querySelector('[name^="phase_title_"]')?.value || ''
          const duration = node.querySelector('[name^="phase_duration_"]')?.value || ''
          const goalkeepers = node.querySelector('[name^="phase_goalkeepers_"]')?.value || ''
          const description = node.querySelector('[name^="phase_description_"]')?.value || ''
          const variants = node.querySelector('[name^="phase_variants_"]')?.value || ''
          const coaching = node.querySelector('[name^="phase_coaching_"]')?.value || ''
          return { title, duration, goalkeepers, description, variants, coaching }
        })
        return {
          date: fd.get('date') || '', time: fd.get('time') || '', location: fd.get('location') === '__custom__' ? (fd.get('custom_location') || '') : (fd.get('location') || ''), progressive: fd.get('progressive') || '', present: updatePresentCount(), focus: fd.get('focus') || '', match_day: fd.get('match_day') || '', intensity: fd.get('intensity') || '', volume: fd.get('volume') || '', objective: fd.get('objective') || '', principles: fd.get('principles') || '', pillars: selectedPillars(), absent: selectedPlayers('absent'), injured: selectedPlayers('injured'), phases
        }
      }

      const bar = (value) => `<span class="ts-mini-scale">${[1,2,3,4,5].map(n=>`<i class="${Number(value)>=n?'on':''}"></i>`).join('')}</span>`
      const fitPreviewToViewport = () => {
        const frame = manualEditor.querySelector('.ts-paper-frame')
        if (!frame || !preview) return
        if (window.innerWidth > 720) {
          preview.style.width = ''
          preview.style.transform = ''
          preview.style.transformOrigin = ''
          frame.style.height = ''
          frame.style.overflow = ''
          return
        }
        const paperWidth = 680
        const available = Math.max(280, frame.clientWidth - 2)
        const scale = Math.min(1, available / paperWidth)
        preview.style.width = `${paperWidth}px`
        preview.style.transformOrigin = 'top left'
        preview.style.transform = `scale(${scale})`
        requestAnimationFrame(() => {
          frame.style.height = `${Math.ceil(preview.scrollHeight * scale + 4)}px`
          frame.style.overflow = 'hidden'
        })
      }

      const updatePreview = () => {
        const d = collect()
        const formattedDate = d.date ? new Date(`${d.date}T12:00:00`).toLocaleDateString('it-IT') : '—'
        const total = d.phases.reduce((sum,p)=>sum+(Number(p.duration)||0),0)
        preview.innerHTML = `
          <div class="ts-watermark" aria-hidden="true"><b>NZ</b><div>${Array.from({length:8},()=>'<span>NICOLA ZECCHI · NICOLA ZECCHI · NICOLA ZECCHI</span>').join('')}</div></div>
          <div class="ts-paper-content">
          <header class="ts-paper-head"><div class="ts-paper-brand"><img src="/mezzolara-logo.png" alt="Mezzolara Calcio"><div><strong>MEZZOLARA CALCIO</strong><span>TRAINING SHEET</span></div></div><div class="ts-paper-title"><small>ALLENATORE · NICOLA ZECCHI</small><strong>ALL_${String(d.progressive || '---').padStart(3,'0')}</strong></div></header>
          <div class="ts-paper-meta"><span><small>Data</small><b>${escape(formattedDate)}</b></span><span><small>Ora</small><b>${escape(d.time || '—')}</b></span><span><small>Campo</small><b>${escape(d.location || '—')}</b></span><span><small>Presenti</small><b>${escape(d.present || '—')}</b></span><span class="ts-paper-md ts-md-${escape((d.match_day || 'none').replace('+','plus').replace('-','minus').toLowerCase())}">${escape(d.match_day || 'MD —')}</span></div>
          <div class="ts-paper-load"><span><small>Focus fisico</small><b>${escape(d.focus || '—')}</b></span><span><small>Intensità</small>${bar(d.intensity)}</span><span><small>Volume</small>${bar(d.volume)}</span><span><small>Durata</small><b>${total || '—'}'</b></span></div>
          <section class="ts-paper-pillars">${['Creare il vantaggio','Conservare il vantaggio','Sfruttare il vantaggio','Difendere il vantaggio'].map((p,i)=>`<span class="pillar-${i+1} ${d.pillars.includes(p)?'is-selected':'is-muted'}">${escape(p)}</span>`).join('')}</section>
          <section class="ts-paper-roster"><div><small>ASSENTI</small><p>${d.absent.length?d.absent.map(n=>`<span>${escape(n)}</span>`).join(''):'<em>Nessuno</em>'}</p></div><div class="inj"><small>INFORTUNATI</small><p>${d.injured.length?d.injured.map(n=>`<span>${escape(n)}</span>`).join(''):'<em>Nessuno</em>'}</p></div></section>
          <section class="ts-paper-objectives"><div><small>OBIETTIVO</small><p>${escape(d.objective || 'Da definire')}</p></div><div><small>PRINCIPI</small><p>${escape(d.principles || 'Da definire')}</p></div></section>
          <section class="ts-paper-body"><div class="ts-paper-phases">${d.phases.length ? d.phases.map((p,i)=>`<article><div><b>${String(i+1).padStart(2,'0')}</b><strong>FASE ${i+1}${p.title?` · ${escape(p.title)}`:''}</strong><span class="ts-phase-gk">Portieri: ${p.goalkeepers==='yes'?'Sì':p.goalkeepers==='separate'?'Separati':'No'}</span><span>${escape(p.duration || '—')}'</span></div><p>${escape(p.description || 'Descrizione da completare')}</p>${p.variants?`<small><b>Varianti:</b> ${escape(p.variants)}</small>`:''}${p.coaching?`<small><b>Coaching point:</b> ${escape(p.coaching)}</small>`:''}</article>`).join('') : '<p class="ts-paper-empty">Aggiungi la prima fase.</p>'}</div></section>
          </div>
        `
        requestAnimationFrame(fitPreviewToViewport)
      }
      window.addEventListener('resize', fitPreviewToViewport, { passive: true })

      const saveDraft = () => {
        localStorage.setItem(storageKey, JSON.stringify(collect()))
        if (draftState) draftState.textContent = 'Bozza salvata'
      }
      const scheduleSave = () => {
        if (draftState) draftState.textContent = 'Salvataggio…'
        clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 450)
      }
      const restore = () => {
        const raw = localStorage.getItem(storageKey)
        phasesRoot.innerHTML = ''
        phaseCount = 0
        form.querySelectorAll('[name="pillars"]').forEach((input) => { input.checked = false })
        manualEditor.querySelectorAll('[data-player-select] input').forEach((input) => { input.checked = false })
        if (!raw) { addPhase(); updateCounts(); updatePreview(); return }
        try {
          const d = JSON.parse(raw)
          Object.entries(d).forEach(([key,value]) => { const field=form.elements.namedItem(key); if(field && !Array.isArray(value)) field.value=value ?? '' })
          d.phases?.length ? d.phases.forEach(addPhase) : addPhase()
          d.pillars?.forEach((value) => { const el=[...form.querySelectorAll('[name="pillars"]')].find((input)=>input.value===value); if(el) el.checked=true })
          const normalize = (value='') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it-IT').replace(/[^a-z0-9]/g,'')
          ;['absent','injured'].forEach((type) => d[type]?.forEach((value) => {
            const el=[...manualEditor.querySelectorAll(`[data-player-select="${type}"] input`)].find((input)=>normalize(input.value)===normalize(value) || normalize(input.dataset.canonicalName)===normalize(value))
            if(el) el.checked=true
          }))
          manualEditor.querySelectorAll('[data-md]').forEach((button)=>button.classList.toggle('is-active',button.dataset.md===d.match_day))
          manualEditor.querySelectorAll('[data-rating]').forEach((group)=>group.querySelectorAll('button').forEach((button)=>button.classList.toggle('is-active',Number(button.dataset.value)<=Number(d[group.dataset.rating]||0))))
          updateCounts(); updatePreview()
        } catch (error) { console.warn('Bozza TS non leggibile:', error); addPhase(); updateCounts(); updatePreview() }
      }
      const updateCounts = () => {
        manualEditor.querySelectorAll('[data-player-select]').forEach(box=>{
          const count=box.querySelectorAll('input:checked').length
          box.querySelector('[data-count]').textContent=`${count} selezionati`
        })
        updatePresentCount()
      }

      manualEditor.querySelector('[data-add-phase]')?.addEventListener('click',()=>{addPhase();updatePreview();scheduleSave()})
      manualEditor.querySelectorAll('[data-md]').forEach(button=>button.addEventListener('click',()=>{ manualEditor.querySelectorAll('[data-md]').forEach(b=>b.classList.remove('is-active')); button.classList.add('is-active'); form.elements.match_day.value=button.dataset.md; updatePreview(); scheduleSave() }))
      manualEditor.querySelectorAll('[data-rating]').forEach(group=>group.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{ const value=Number(button.dataset.value); group.querySelector('input').value=value; group.querySelectorAll('button').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.value)<=value)); updatePreview(); scheduleSave() })))
      manualEditor.querySelectorAll('[data-player-select] input').forEach((input) => {
        input.addEventListener('change', () => {
          if (input.checked) {
            const currentType = input.closest('[data-player-select]')?.dataset.playerSelect
            const otherType = currentType === 'absent' ? 'injured' : 'absent'
            const twin = [...manualEditor.querySelectorAll(`[data-player-select="${otherType}"] input`)]
              .find((candidate) => candidate.value === input.value)
            if (twin) twin.checked = false
          }
        })
      })
      form.addEventListener('input',()=>{updateCounts();updatePreview();scheduleSave()})
      form.addEventListener('change',()=>{updateCounts();updatePreview();scheduleSave()})
      manualEditor.querySelector('[data-analyze-exercises]')?.addEventListener('click',()=>{
        const d=collect(); const text=d.phases.map(p=>`${p.title} ${p.description}`).join(' ').toLowerCase(); const pillars=d.pillars
        const objectiveBits=[]; const principles=[]
        if(/costru|uscita|portiere|prima pressione/.test(text)){objectiveBits.push('creare vantaggio nella costruzione sotto pressione');principles.push('occupazione razionale degli spazi','ricerca dell’uomo libero','sostegno al possessore')}
        if(/possesso|rondo|jolly|conserv/.test(text)){objectiveBits.push('conservare il possesso con continuità');principles.push('smarcamento in appoggio','mobilità','qualità del primo controllo')}
        if(/final|porta|attacco|invasione|profond/.test(text)){objectiveBits.push('sfruttare il vantaggio per arrivare alla finalizzazione');principles.push('attacco della profondità','occupazione dell’area','tempi di inserimento')}
        if(/press|riaggress|transizione|riconquista/.test(text)){objectiveBits.push('proteggere il vantaggio attraverso pressione e riaggressione');principles.push('reazione immediata alla perdita','densità vicino alla palla','coperture preventive')}
        if(!objectiveBits.length) objectiveBits.push(pillars.length ? pillars.join(', ').toLowerCase() : 'sviluppare i comportamenti collettivi previsti dalla seduta')
        form.elements.objective.value=objectiveBits.join('; ').replace(/^./,c=>c.toUpperCase())+'.'
        form.elements.principles.value=[...new Set(principles)].join(', ') || 'Distanze funzionali, comunicazione, orientamento del corpo e velocità di esecuzione.'
        const note=manualEditor.querySelector('[data-ai-note]'); if(note) note.textContent='Proposta inserita: controlla e modifica liberamente i due campi.'
        updatePreview();scheduleSave()
      })
      const determineNextProgressive = () => {
        const fromPaths = calendarEvents
          .map((event) => event.trainingSheetPath || '')
          .map((path) => Number(path.match(/(?:ALL|AL)[_-]?(\d{1,3})/i)?.[1] || 0))
        const storedNext = Number(localStorage.getItem('nz-training-sheet-next-progressive') || 0)
        return Math.max(1, storedNext, ...fromPaths.map((value) => value + 1))
      }
      const confirmPdfPreview = (blob, fileName) => new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(blob)
        const overlay = document.createElement('div')
        overlay.className = 'ts-pdf-confirm-overlay'
        overlay.innerHTML = `
          <section class="ts-pdf-confirm-dialog" role="dialog" aria-modal="true" aria-label="Anteprima PDF">
            <header>
              <div><span>ANTEPRIMA DI STAMPA</span><strong>${tsEscapeHtml(fileName)}</strong></div>
              <button type="button" data-pdf-cancel aria-label="Chiudi">×</button>
            </header>
            <iframe title="Anteprima PDF" src="${objectUrl}#toolbar=1&navpanes=0&view=FitH"></iframe>
            <footer>
              <button type="button" class="secondary" data-pdf-cancel>Annulla</button>
              <button type="button" class="primary" data-pdf-confirm>Conferma e salva PDF</button>
            </footer>
          </section>`
        document.body.appendChild(overlay)
        const finish = (confirmed) => {
          URL.revokeObjectURL(objectUrl)
          overlay.remove()
          resolve(confirmed)
        }
        overlay.querySelectorAll('[data-pdf-cancel]').forEach((button) => button.addEventListener('click', () => finish(false)))
        overlay.querySelector('[data-pdf-confirm]')?.addEventListener('click', () => finish(true))
        overlay.addEventListener('click', (event) => { if (event.target === overlay) finish(false) })
      })

      const createAndPublishPdf = async () => {
        const button = manualEditor.querySelector('[data-print-sheet]')
        const note = manualEditor.querySelector('[data-publish-note]')
        const d = collect()
        if (!d.date || !d.time || !d.location) {
          if (note) note.textContent = 'Completa data, orario e campo prima di creare il PDF.'
          return
        }
        if (!window.html2canvas || !window.jspdf?.jsPDF) {
          if (note) note.textContent = 'Generatore PDF non disponibile. Controlla la connessione e ricarica la pagina.'
          return
        }
        button.disabled = true
        button.classList.add('is-loading')
        const originalLabel = button.querySelector('span')?.textContent || 'Crea PDF'
        if (button.querySelector('span')) button.querySelector('span').textContent = 'Creazione…'
        if (note) note.textContent = 'Creazione e pubblicazione della Training Sheet…'
        try {
          const canvas = await window.html2canvas(preview, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: preview.scrollWidth,
            height: preview.scrollHeight,
          })
          const { jsPDF } = window.jspdf
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
          const pageWidth = 210
          const pageHeight = 297
          const margin = 5
          const imageWidth = pageWidth - margin * 2
          const imageHeight = canvas.height * imageWidth / canvas.width
          const scale = Math.min(1, (pageHeight - margin * 2) / imageHeight)
          const finalWidth = imageWidth * scale
          const finalHeight = imageHeight * scale
          pdf.addImage(canvas.toDataURL('image/jpeg', .96), 'JPEG', (pageWidth-finalWidth)/2, margin, finalWidth, finalHeight, undefined, 'FAST')
          const blob = pdf.output('blob')
          const progressive = String(Number(d.progressive || 1)).padStart(3, '0')
          const safeDate = d.date.replaceAll('-', '')
          const fileName = `ALL_${progressive}_${safeDate}.pdf`
          const filePath = `${d.date}/${fileName}`

          if (note) note.textContent = 'Controlla l’anteprima e conferma il salvataggio.'
          const confirmed = await confirmPdfPreview(blob, fileName)
          if (!confirmed) {
            if (note) note.textContent = 'Creazione PDF annullata. Nessun file è stato salvato.'
            return
          }
          if (note) note.textContent = 'Salvataggio e collegamento al Calendario…'

          const existingEvent = calendarEvents.find((event) => {
            if (!isTrainingEventType(event.type)) return false
            const localDate = new Date(event.startAt).toLocaleDateString('sv-SE')
            return localDate === d.date
          })

          const upload = await supabase.storage.from('training-sheets').upload(filePath, blob, {
            contentType: 'application/pdf', cacheControl: '3600', upsert: true,
          })
          if (upload.error) throw upload.error

          const eventPayload = {
            title: 'Allenamento', event_type: 'training',
            start_at: new Date(`${d.date}T${d.time}:00`).toISOString(),
            location: d.location || null, match_day: d.match_day || null,
            present_count: Number(d.present) || 0, squad_total: squadTotal,
            training_sheet_path: filePath,
            notes: JSON.stringify({ type: 'training_sheet_editor', version: 1, data: d }),
          }
          const result = existingEvent
            ? await supabase.from('events').update(eventPayload).eq('id', existingEvent.id)
            : await supabase.from('events').insert(eventPayload)
          if (result.error) {
            await supabase.storage.from('training-sheets').remove([filePath])
            throw result.error
          }

          pdf.save(fileName)
          localStorage.setItem('nz-training-sheet-next-progressive', String(Number(d.progressive || 1) + 1))
          localStorage.setItem(`nz-training-sheet:${filePath}`, JSON.stringify(d))
          await loadCalendarEvents()
          if (note) note.textContent = 'PDF creato e Training Sheet collegata al Calendario.'
          if (draftState) draftState.textContent = 'Pubblicata'
        } catch (error) {
          console.error('Errore pubblicazione Training Sheet:', error)
          if (note) note.textContent = `Errore: ${error?.message || 'pubblicazione non riuscita'}`
        } finally {
          button.disabled = false
          button.classList.remove('is-loading')
          if (button.querySelector('span')) button.querySelector('span').textContent = originalLabel
        }
      }
      const resetEditor = () => {
        if (!window.confirm('Vuoi cancellare tutti i campi della Training Sheet Editor?')) return
        localStorage.removeItem(storageKey)
        form.reset()
        form.elements.time.value = '17:30'
        form.elements.location.value = 'Mezzolara'
        if (form.elements.custom_location) form.elements.custom_location.value = ''
        syncTsLocation()
        manualEditor.querySelectorAll('[data-md] button, [data-md]').forEach?.(() => {})
        manualEditor.querySelectorAll('[data-md]').forEach((button) => button.classList.remove('is-active'))
        manualEditor.querySelectorAll('[data-rating] button').forEach((button) => button.classList.remove('is-active'))
        manualEditor.querySelectorAll('[data-player-select] input').forEach((input) => { input.checked = false })
        manualEditor.querySelectorAll('[name="pillars"]')?.forEach?.((input) => { input.checked = false })
        phasesRoot.innerHTML = ''
        addPhase()
        form.elements.progressive.value = String(determineNextProgressive())
        const today = new Date().toLocaleDateString('sv-SE')
        form.elements.date.value = today
        updateCounts(); updatePreview(); saveDraft()
        if (draftState) draftState.textContent = 'Editor azzerato'
      }
      manualEditor.querySelector('[data-reset-training-sheet]')?.addEventListener('click', resetEditor)

      manualEditor.querySelector('[data-open-training-sheet]')?.addEventListener('change', (event) => {
        const selected = calendarEvents.find((item) => item.id === event.target.value)
        if (!selected) return
        const savedKey = selected.trainingSheetPath ? `nz-training-sheet:${selected.trainingSheetPath}` : ''
        const saved = selected.editorData ? JSON.stringify(selected.editorData) : (savedKey ? localStorage.getItem(savedKey) : null)
        if (saved) {
          localStorage.setItem(storageKey, saved)
          restore()
        } else {
          form.elements.date.value = new Date(selected.startAt).toLocaleDateString('sv-SE')
          form.elements.time.value = selected.time || '17:30'
          const selectedPlace = selected.place || 'Mezzolara'
          if (['Mezzolara','Budrio'].includes(selectedPlace)) {
            form.elements.location.value = selectedPlace
            if (form.elements.custom_location) form.elements.custom_location.value = ''
          } else {
            form.elements.location.value = '__custom__'
            if (form.elements.custom_location) form.elements.custom_location.value = selectedPlace
          }
          syncTsLocation()
          form.elements.match_day.value = selected.matchDay || ''
          form.elements.progressive.value = String(Number(selected.trainingSheetPath?.match(/(?:ALL|AL)[_-]?(\d{1,3})/i)?.[1] || determineNextProgressive()))
          manualEditor.querySelectorAll('[data-md]').forEach((button) => button.classList.toggle('is-active', button.dataset.md === selected.matchDay))
          updatePreview(); scheduleSave()
        }
        if (draftState) draftState.textContent = 'Training Sheet aperta'
      })

      manualEditor.querySelector('[data-print-sheet]')?.addEventListener('click', createAndPublishPdf)
      restore()
      const nextProgressive = determineNextProgressive()
      if (form.elements.progressive && Number(form.elements.progressive.value || 0) < nextProgressive) {
        form.elements.progressive.value = String(nextProgressive)
      }
      updateCounts();updatePreview()
    }

    root
      .querySelectorAll('[data-open-event]')
      .forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          openDrawer(button.dataset.openEvent)
        })
      })

    root
      .querySelectorAll('[data-new-event]')
      .forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          openNewEventModal()
        })
      })

    root
      .querySelectorAll('[data-create-event-date]')
      .forEach((cell) => {
        cell.addEventListener('click', () => {
          openNewEventModal(cell.dataset.createEventDate)
        })
      })


    root.querySelector('[data-calendar-prev]')?.addEventListener('click', () => {
      currentCalendarDate = new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth() - 1,
        1,
      )
      root.innerHTML = calendarView()
      bindDynamic()
    })

    root.querySelector('[data-calendar-next]')?.addEventListener('click', () => {
      currentCalendarDate = new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth() + 1,
        1,
      )
      root.innerHTML = calendarView()
      bindDynamic()
    })

    root.querySelector('[data-calendar-today]')?.addEventListener('click', () => {
      goToCurrentMonth()
      root.innerHTML = calendarView()
      bindDynamic()
      const todayCell = root.querySelector('.calendar-cell.is-today')
      todayCell?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })

    root.querySelector('[data-profile-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const form = event.currentTarget
      const formData = new FormData(form)
      const firstName = formData.get('first_name')?.toString().trim() ?? ''
      const lastName = formData.get('last_name')?.toString().trim() ?? ''
      const message = form.querySelector('[data-profile-message]')
      if (!firstName || !lastName) return

      const fullName = `${firstName} ${lastName}`.trim()
      const { error: profileError } = await supabase.rpc('update_my_profile', {
        p_first_name: firstName,
        p_last_name: lastName,
      })

      if (profileError) {
        message.textContent = profileError.message
        message.className = 'form-message is-error'
        return
      }

      const { data, error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } })
      if (authError) {
        message.textContent = authError.message
        message.className = 'form-message is-error'
        return
      }

      currentUser = data.user
      currentUserProfile = { ...currentUserProfile, first_name: firstName, last_name: lastName }
      syncProfileHeader()
      message.textContent = 'Profilo aggiornato.'
      message.className = 'form-message is-success'
    })

    root.querySelector('[data-open-staff]')?.addEventListener('click', async () => {
      await setView('staff', 'Gestione Staff')
    })

    root.querySelector('[data-open-profile]')?.addEventListener('click', async () => {
      await setView('profile', 'Profilo')
    })

    const analysisImportButton = root.querySelector('[data-import-analysis]')
    const analysisFileInput = root.querySelector('[data-analysis-file]')
    analysisImportButton?.addEventListener('click', () => analysisFileInput?.click())

    analysisFileInput?.addEventListener('change', async (event) => {
      const file = event.currentTarget.files?.[0]
      const message = root.querySelector('[data-analysis-message]')
      if (!file) return
      try {
        const text = await file.text()
        const rows = parseCsv(text)
        if (rows.length < 2) throw new Error('Il CSV non contiene risposte.')
        const headers = rows[0].map(normalizeCsvHeader)
        const records = rows.slice(1).filter(row => row.some(cell => String(cell).trim())).map((row) => {
          const obj = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
          const pick = (...keys) => {
            for (const key of keys) {
              const found = headers.find(header => header.includes(key))
              if (found && obj[found]) return String(obj[found]).trim()
            }
            return ''
          }
          const rawDate = pick('data della gara', 'data gara', 'data')
          return {
            observer: pick('nome osservatore', 'osservatore', 'nome'),
            match_date: parseItalianDate(rawDate),
            match_name: pick('partita analizzata', 'partita', 'gara'),
            minute: pick('minuto evento', 'minuto'),
            game_phase: pick('fase del gioco', 'fase di gioco', 'fase'),
            outcome: pick('esito'),
            observation: pick('osservazione riscontrata', 'osservazione', 'descrizione'),
            raw_data: obj,
          }
        })
        const { error } = await supabase.from('match_analysis').insert(records)
        if (error) throw error
        message.textContent = `${records.length} osservazioni importate.`
        message.className = 'form-message is-success'
        await loadAnalysisEntries()
        root.innerHTML = analysisView()
        bindDynamic()
      } catch (error) {
        message.textContent = error.message || 'Importazione non riuscita.'
        message.className = 'form-message is-error'
      } finally {
        event.currentTarget.value = ''
      }
    })

    root.querySelector('[data-analysis-search]')?.addEventListener('input', (event) => {
      const query = event.currentTarget.value.trim().toLocaleLowerCase('it-IT')
      let visible = 0
      root.querySelectorAll('.match-analysis-row').forEach((row) => {
        const match = row.textContent.toLocaleLowerCase('it-IT').includes(query)
        row.hidden = !match
        if (match) visible += 1
      })
      const count = root.querySelector('[data-analysis-count]')
      if (count) count.textContent = `${visible} osservazioni`
    })

    root.querySelectorAll('[data-staff-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault()
        const userId = form.dataset.userId
        const data = new FormData(form)
        const message = form.querySelector('[data-staff-message]')
        const payload = {
          first_name: data.get('first_name')?.toString().trim() ?? '',
          last_name: data.get('last_name')?.toString().trim() ?? '',
          role: data.get('role')?.toString() ?? 'observer',
          active: data.get('active') === 'on',
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase.rpc('admin_update_staff_profile', {
          p_user_id: userId,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_role: payload.role,
          p_active: payload.active,
        })
        if (error) {
          message.textContent = error.message
          message.className = 'form-message is-error'
          return
        }

        message.textContent = 'Membro aggiornato.'
        message.className = 'form-message is-success'

        if (userId === currentUser.id) {
          currentUserProfile = { ...currentUserProfile, ...payload }
          currentUserRole = payload.role
          syncProfileHeader()
        }
      })
    })

    root.querySelector('[data-password-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const form = event.currentTarget
      const data = new FormData(form)
      const password = data.get('password')?.toString() ?? ''
      const confirmation = data.get('password_confirm')?.toString() ?? ''
      const message = form.querySelector('[data-password-message]')
      if (password !== confirmation) { message.textContent = 'Le password non coincidono.'; message.className = 'form-message is-error'; return }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { message.textContent = error.message; message.className = 'form-message is-error'; return }
      form.reset()
      message.textContent = 'Password aggiornata.'
      message.className = 'form-message is-success'
    })


    const tsNarration = root.querySelector('[data-ts-narration]')
    const tsRecordButton = root.querySelector('[data-ts-record]')
    const tsStopButton = root.querySelector('[data-ts-stop]')
    const tsRecordLabel = root.querySelector('[data-ts-record-label]')
    const tsVoiceStatus = root.querySelector('[data-ts-voice-status]')
    const tsVoiceHelp = root.querySelector('[data-ts-voice-help]')
    const tsForm = root.querySelector('[data-ts-form]')
    const tsEmpty = root.querySelector('[data-ts-empty]')
    const tsStatus = root.querySelector('[data-ts-status]')
    const tsMessage = root.querySelector('[data-ts-message]')
    let tsDraftId = null
    let tsAutosaveTimer = null
    let tsSaving = false
    let tsSaveQueued = false
    let tsRecognition = null
    let tsRecognitionActive = false
    let tsRecognitionShouldRestart = false
    let tsRecognitionBaseText = ''
    let tsRecognitionFinalText = ''

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition

    const setTsVoiceState = (state, text) => {
      if (tsVoiceStatus) {
        tsVoiceStatus.textContent = text
        tsVoiceStatus.className = `ts-voice-status is-${state}`
      }
      if (tsRecordButton) {
        tsRecordButton.classList.toggle('is-recording', state === 'recording')
        tsRecordButton.disabled = state === 'unsupported' || state === 'starting'
      }
      if (tsStopButton) tsStopButton.disabled = state !== 'recording' && state !== 'starting'
      if (tsRecordLabel) tsRecordLabel.textContent = state === 'recording' ? 'In ascolto…' : 'Registra'
    }

    const normalizeTsSpeechText = (value = '') => String(value)
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()

    const joinTsSpeechText = (...parts) => parts
      .map(part => normalizeTsSpeechText(part))
      .filter(Boolean)
      .join(' ')
      .trim()

    const stopTsRecognition = () => {
      tsRecognitionShouldRestart = false
      if (tsRecognition && tsRecognitionActive) {
        try { tsRecognition.stop() } catch (error) { console.warn('Arresto microfono non riuscito:', error) }
      } else {
        tsRecognitionActive = false
        setTsVoiceState(SpeechRecognitionApi ? 'ready' : 'unsupported', SpeechRecognitionApi ? 'Microfono pronto' : 'Dettatura non supportata')
      }
    }

    const createTsRecognition = () => {
      if (!SpeechRecognitionApi || tsRecognition) return tsRecognition

      const recognition = new SpeechRecognitionApi()
      recognition.lang = 'it-IT'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        tsRecognitionActive = true
        setTsVoiceState('recording', 'Registrazione in corso')
        if (tsVoiceHelp) tsVoiceHelp.textContent = 'Parla normalmente. Il testo compare mentre detti.'
      }

      recognition.onresult = (event) => {
        let interimText = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || ''
          if (event.results[index].isFinal) tsRecognitionFinalText = joinTsSpeechText(tsRecognitionFinalText, transcript)
          else interimText = joinTsSpeechText(interimText, transcript)
        }
        if (tsNarration) {
          tsNarration.value = joinTsSpeechText(tsRecognitionBaseText, tsRecognitionFinalText, interimText)
          tsNarration.dispatchEvent(new Event('input', { bubbles: true }))
          tsNarration.scrollTop = tsNarration.scrollHeight
        }
      }

      recognition.onerror = (event) => {
        const messages = {
          'not-allowed': 'Permesso microfono negato. Abilitalo nelle impostazioni del sito.',
          'service-not-allowed': 'Servizio di dettatura non disponibile nel browser.',
          'audio-capture': 'Microfono non trovato o non disponibile.',
          'no-speech': 'Non ho rilevato la voce. Premi Registra e riprova.',
          network: 'Connessione necessaria per la dettatura del browser.',
          aborted: 'Registrazione interrotta.',
        }
        const message = messages[event.error] || `Errore microfono: ${event.error}`
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
          tsRecognitionShouldRestart = false
        }
        setTsVoiceState('error', message)
      }

      recognition.onend = () => {
        tsRecognitionActive = false
        if (tsRecognitionShouldRestart) {
          window.setTimeout(() => {
            if (!tsRecognitionShouldRestart) return
            try { recognition.start() } catch (error) {
              tsRecognitionShouldRestart = false
              setTsVoiceState('error', 'Impossibile riavviare il microfono. Premi Registra.')
            }
          }, 250)
          return
        }
        tsRecognitionBaseText = joinTsSpeechText(tsRecognitionBaseText, tsRecognitionFinalText)
        tsRecognitionFinalText = ''
        setTsVoiceState('ready', tsNarration?.value.trim() ? 'Trascrizione pronta' : 'Microfono pronto')
        if (tsVoiceHelp) tsVoiceHelp.textContent = 'Puoi correggere il testo e poi premere “Analizza seduta”.'
      }

      tsRecognition = recognition
      return recognition
    }

    if (!SpeechRecognitionApi) {
      setTsVoiceState('unsupported', 'Dettatura non supportata da questo browser')
      if (tsVoiceHelp) tsVoiceHelp.textContent = 'Apri il Coach Portal con Google Chrome o Microsoft Edge aggiornato.'
    } else {
      setTsVoiceState('ready', 'Microfono pronto')
    }

    tsRecordButton?.addEventListener('click', () => {
      if (!SpeechRecognitionApi || tsRecognitionActive) return
      const recognition = createTsRecognition()
      tsRecognitionBaseText = tsNarration?.value.trim() || ''
      tsRecognitionFinalText = ''
      tsRecognitionShouldRestart = true
      setTsVoiceState('starting', 'Attivazione microfono…')
      try {
        recognition.start()
      } catch (error) {
        tsRecognitionShouldRestart = false
        setTsVoiceState('error', 'Microfono già attivo o momentaneamente non disponibile.')
      }
    })

    tsStopButton?.addEventListener('click', stopTsRecognition)

    const setTsSaveState = (state, text) => {
      const saveMessage = tsForm?.querySelector('[data-ts-save-message]')
      const saveRow = tsForm?.querySelector('.ts-autosave-row')
      if (!saveMessage || !saveRow) return
      saveMessage.textContent = text
      saveRow.className = `ts-autosave-row is-${state}`
    }

    const buildTsPayload = () => {
      if (!tsForm?.dataset.parserResult) return null
      const formData = new FormData(tsForm)
      const original = JSON.parse(tsForm.dataset.parserResult)
      const payloadData = {
        ...original.data,
        date: formData.get('date') || null,
        time: formData.get('time') || null,
        location: String(formData.get('location') || '').trim() || null,
        focus_physical: String(formData.get('focus_physical') || '').trim() || null,
        intensity: Number(formData.get('intensity')) || null,
        volume: Number(formData.get('volume')) || null,
        objective: String(formData.get('objective') || '').trim(),
        principles: String(formData.get('principles') || '').split('·').map(v => v.trim()).filter(Boolean),
        phases: original.data.phases.map((phase, index) => ({
          ...phase,
          title: String(formData.get(`phase_${index}_title`) || '').trim(),
          duration_minutes: Number(formData.get(`phase_${index}_duration`)) || null,
          goalkeepers: formData.get(`phase_${index}_goalkeepers`) === 'true',
          description: String(formData.get(`phase_${index}_description`) || '').trim(),
          containers: String(formData.get(`phase_${index}_containers`) || '').split('·').map(v => v.trim()).filter(Boolean),
        })),
      }
      payloadData.total_duration_minutes = payloadData.phases.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0)
      return payloadData
    }

    const saveTsDraft = async () => {
      if (!tsForm || tsForm.hidden || !currentUser || !tsNarration?.value.trim()) return
      if (tsSaving) {
        tsSaveQueued = true
        return
      }

      const payloadData = buildTsPayload()
      if (!payloadData) return

      tsSaving = true
      setTsSaveState('saving', 'Salvataggio automatico in corso…')

      const row = {
        user_id: currentUser.id,
        source_text: tsNarration.value.trim(),
        status: 'draft',
        session_date: payloadData.date,
        session_time: payloadData.time,
        location: payloadData.location,
        parsed_data: payloadData,
        updated_at: new Date().toISOString(),
      }

      let response
      if (tsDraftId) {
        response = await supabase
          .from('training_sheet_drafts')
          .update(row)
          .eq('id', tsDraftId)
          .eq('user_id', currentUser.id)
          .select('id')
          .single()
      } else {
        response = await supabase
          .from('training_sheet_drafts')
          .insert(row)
          .select('id')
          .single()
      }

      tsSaving = false
      if (response.error) {
        setTsSaveState('error', `Salvataggio non riuscito: ${response.error.message}`)
      } else {
        tsDraftId = response.data?.id || tsDraftId
        setTsSaveState('saved', 'Bozza salvata automaticamente.')
      }

      if (tsSaveQueued) {
        tsSaveQueued = false
        await saveTsDraft()
      }
    }

    const scheduleTsAutosave = () => {
      window.clearTimeout(tsAutosaveTimer)
      setTsSaveState('pending', 'Modifiche da sincronizzare…')
      tsAutosaveTimer = window.setTimeout(saveTsDraft, 700)
    }

    const attachTsFieldAutosave = () => {
      tsForm?.querySelectorAll('input, textarea, select').forEach((field) => {
        field.addEventListener('input', scheduleTsAutosave)
        field.addEventListener('change', scheduleTsAutosave)
      })
    }

    const restoreLatestTsDraft = async () => {
      if (!currentUser?.id || !tsNarration || !tsForm || !tsEmpty || !tsStatus) return

      const { data, error } = await supabase
        .from('training_sheet_drafts')
        .select('id, source_text, parsed_data, status, updated_at')
        .eq('user_id', currentUser.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Impossibile ripristinare la bozza Training Sheet:', error.message)
        return
      }

      if (!data?.parsed_data) return

      const parsed = data.parsed_data
      const missingFields = []
      if (!parsed.date) missingFields.push('Data')
      if (!parsed.time) missingFields.push('Orario')
      if (!parsed.location) missingFields.push('Campo')
      if (!Array.isArray(parsed.phases) || parsed.phases.length === 0) missingFields.push('Fasi')
      if (!parsed.focus_physical) missingFields.push('Focus fisico')
      if (!parsed.intensity) missingFields.push('Intensità')
      if (!parsed.volume) missingFields.push('Volume')

      const result = {
        data: parsed,
        missing_fields: missingFields,
        status: missingFields.length ? 'da_completare' : 'pronta',
      }

      tsDraftId = data.id
      tsNarration.value = data.source_text || ''
      tsEmpty.hidden = true
      tsForm.hidden = false
      tsForm.innerHTML = trainingSheetResultHtml(result)
      tsForm.dataset.parserResult = JSON.stringify(result)
      tsStatus.textContent = missingFields.length ? 'Da completare' : 'Pronta'
      tsStatus.className = `ts-status ${missingFields.length ? 'is-warning' : 'is-ready'}`
      attachTsFieldAutosave()
      setTsSaveState('saved', 'Bozza ripristinata e salvata automaticamente.')
      if (tsMessage) {
        tsMessage.textContent = 'Ultima bozza ripristinata.'
        tsMessage.className = 'form-message is-success'
      }
    }

    root.querySelector('[data-ts-clear]')?.addEventListener('click', () => {
      stopTsRecognition()
      window.clearTimeout(tsAutosaveTimer)
      tsRecognitionBaseText = ''
      tsRecognitionFinalText = ''
      tsDraftId = null
      if (tsNarration) tsNarration.value = ''
      if (tsForm) { tsForm.hidden = true; tsForm.innerHTML = ''; delete tsForm.dataset.parserResult }
      if (tsEmpty) tsEmpty.hidden = false
      if (tsStatus) { tsStatus.textContent = 'In attesa'; tsStatus.className = 'ts-status is-empty' }
      if (tsMessage) { tsMessage.textContent = ''; tsMessage.className = 'form-message' }
    })

    root.querySelector('[data-ts-analyze]')?.addEventListener('click', async () => {
      const text = tsNarration?.value.trim() || ''
      if (!text) {
        tsMessage.textContent = 'Inserisci la dettatura prima di analizzare.'
        tsMessage.className = 'form-message is-error'
        return
      }

      const result = parseTrainingSheetNarration(text, players)
      tsMessage.textContent = 'Seduta analizzata. La bozza viene salvata automaticamente.'
      tsMessage.className = 'form-message is-success'
      tsEmpty.hidden = true
      tsForm.hidden = false
      tsForm.innerHTML = trainingSheetResultHtml(result)
      tsForm.dataset.parserResult = JSON.stringify(result)
      tsStatus.textContent = result.status === 'pronta' ? 'Pronta' : 'Da completare'
      tsStatus.className = `ts-status ${result.status === 'pronta' ? 'is-ready' : 'is-warning'}`

      attachTsFieldAutosave()

      await saveTsDraft()
    })

    await restoreLatestTsDraft()

    root.querySelectorAll('[data-player-profile]').forEach((button) => {
      button.addEventListener('click', () => {
        const player = players.find((item) => playerKey(item.name) === button.dataset.playerProfile)
        if (!player || !modalRoot) return
        modalRoot.innerHTML = playerProfileModalHtml(player)
        document.body.classList.add('new-event-modal-open')

        const closeProfile = () => {
          modalRoot.innerHTML = ''
          document.body.classList.remove('new-event-modal-open')
        }

        modalRoot.querySelectorAll('[data-close-player-profile]').forEach((element) => {
          element.addEventListener('click', (event) => {
            if (element.classList.contains('player-profile-backdrop') && event.target !== element) return
            closeProfile()
          })
        })

        modalRoot.querySelector('[data-player-profile-form]')?.addEventListener('submit', async (event) => {
          event.preventDefault()
          const profileForm = event.currentTarget
          const message = profileForm.querySelector('[data-player-profile-message]')
          const values = Object.fromEntries(new FormData(profileForm).entries())
          const numberOrNull = (value) => value === '' ? null : Number(value)
          const payload = {
            player_key: profileForm.dataset.playerKey,
            full_name: String(values.full_name || '').trim(),
            role: values.role,
            birth_year: values.birth_year || null,
            preferred_foot: values.preferred_foot || null,
            height_cm: numberOrNull(values.height_cm),
            weight_kg: numberOrNull(values.weight_kg),
            phone: values.phone || null,
            email: values.email || null,
            technical_notes: values.technical_notes || null,
            injury_notes: values.injury_notes || null,
            updated_at: new Date().toISOString(),
          }
          const { data: saved, error } = await supabase
            .from('player_profiles')
            .upsert(payload, { onConflict: 'player_key' })
            .select()
            .single()
          if (error) {
            message.textContent = `Errore: ${error.message}`
            message.className = 'form-message is-error'
            return
          }
          playerProfiles[payload.player_key] = saved
          message.textContent = 'Scheda salvata correttamente.'
          message.className = 'form-message is-success'
        })
      })
    })

    root.querySelector('[data-dashboard-calendar]')?.addEventListener('click', async () => {
      setActiveNavigation('calendar')
      localStorage.setItem('nz-active-section', 'calendar')
      await setView('calendar', 'Calendario')
    })

    root.querySelector('[data-library-search]')?.addEventListener('input', (event) => {
      const query = event.currentTarget.value.trim().toLocaleLowerCase('it-IT')
      const libraryRoot = root.querySelector('[data-library-root]')
      const noResults = root.querySelector('[data-library-no-results]')
      let visibleSheets = 0

      libraryRoot?.querySelectorAll('[data-library-sheet]').forEach((card) => {
        const matches = !query || card.dataset.searchText.includes(query)
        card.hidden = !matches
        if (matches) visibleSheets += 1
      })

      libraryRoot?.querySelectorAll('[data-library-week]').forEach((week) => {
        const hasVisibleSheets = Array.from(week.querySelectorAll('[data-library-sheet]'))
          .some((card) => !card.hidden)
        week.hidden = !hasVisibleSheets
        if (query && hasVisibleSheets) week.open = true
      })

      libraryRoot?.querySelectorAll('[data-library-month]').forEach((month) => {
        const hasVisibleWeeks = Array.from(month.querySelectorAll('[data-library-week]'))
          .some((week) => !week.hidden)
        month.hidden = !hasVisibleWeeks
        if (query && hasVisibleWeeks) month.open = true
      })

      if (noResults) noResults.hidden = visibleSheets > 0 || !query
    })
  }

  document
    .querySelectorAll('.nav-item')
    .forEach((button) => {
      button.addEventListener('click', async () => {
        const sectionKey = button.dataset.section
        const sectionLabel = button.textContent.trim()

        setActiveNavigation(sectionKey)
        localStorage.setItem('nz-active-section', sectionKey)
        await setView(sectionKey, sectionLabel)
        closeProfileMenu()
      })
    })

  // Gestione robusta del menu profilo: funziona anche su touch/mobile
  // e non dipende dal punto esatto su cui viene premuto il pulsante.
  let profilePointerHandled = false

  const handleProfileMenuPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    profilePointerHandled = true
    toggleProfileMenu()
  }

  const handleProfileMenuClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (profilePointerHandled) {
      profilePointerHandled = false
      return
    }

    toggleProfileMenu()
  }

  profileMenuButton?.addEventListener(
    'pointerdown',
    handleProfileMenuPointerDown,
  )
  profileMenuButton?.addEventListener('click', handleProfileMenuClick)

  profileDropdown?.addEventListener('click', (event) => {
    event.stopPropagation()
  })


  document
    .querySelectorAll('[data-profile-action]')
    .forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.dataset.profileAction

        if (action === 'profile') {
          setActiveNavigation('')
          setView('profile', 'Profilo')
          closeProfileMenu()
          return
        }

        if (action === 'logout') {
          closeProfileMenu()
        }
      })
    })

  document.addEventListener('click', (event) => {
    const clickedInsideProfileMenu =
      event.target.closest('.profile-menu-wrapper')

    if (!clickedInsideProfileMenu) {
      closeProfileMenu()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProfileMenu()
      closeDrawer()
      closeNewEventModal()
    }
  })

  await bindDynamic()

  const savedSection = localStorage.getItem('nz-active-section')
  if (savedSection && savedSection !== 'dashboard' && menu.some(([key]) => key === savedSection)) {
    setActiveNavigation(savedSection)
    await setView(savedSection, menu.find(([key]) => key === savedSection)?.[1] || '')
  }
}
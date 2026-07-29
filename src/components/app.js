import { icon } from './icons.js'
import { supabase } from '../supabase.js'

import {
  players,
  analysisItems,
} from '../data/appData.js'

let calendarEvents = []
let currentUserRole = 'observer'
let currentUser = null
let currentCalendarDate = new Date()
currentCalendarDate.setDate(1)

function isOwner() {
  return currentUserRole === 'owner'
}

async function loadCurrentUserRole(user) {
  if (!user?.id) {
    currentUserRole = 'observer'
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Errore caricamento ruolo:', error.message)
    currentUserRole = 'observer'
    return
  }

  currentUserRole = data?.role ?? 'observer'
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
      }
    }),
  )
}

const menu = [
  ['dashboard', 'Dashboard'],
  ['calendar', 'Calendario'],
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
  const today = new Date()
  const todayEvents = getTodayEvents()
  const nextTraining = getNextTraining()

  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Dashboard</h1>

          <p>
            <span>STAGIONE 2026/27</span>
            <b>•</b>
            Serie D
          </p>
        </div>
      </div>

      <div class="stats-grid">
        ${statCards()}
      </div>

      <div class="dashboard-layout dashboard-layout--compact">
        <article class="panel today-panel">
          <div class="panel-head">
            <div>
              <span>OGGI</span>
              <h2>${formatLongDate(today)}</h2>
            </div>

            <strong>${todayEvents.length} ${todayEvents.length === 1 ? 'attività' : 'attività'}</strong>
          </div>

          <div class="timeline">
            ${todayEvents.length
              ? todayEvents
                  .map(
                    (item) => `
                      <div class="timeline-item">
                        <time>${item.time}</time>
                        <i class="${item.type}"></i>

                        <div>
                          <strong>${item.title}</strong>
                          <span>${item.place || 'Luogo non indicato'}${item.type === 'training' && item.matchDay ? ` · ${item.matchDay}` : ''}</span>
                        </div>
                      </div>
                    `,
                  )
                  .join('')
              : `
                  <div class="dashboard-empty-state">
                    Nessuna attività programmata per oggi.
                  </div>
                `}
          </div>
        </article>

        <article class="panel quick-panel">
          <div class="panel-head">
            <div>
              <span>PROSSIMO ALLENAMENTO</span>
              <h2>${nextTraining ? `${nextTraining.time} · ${nextTraining.place || 'Luogo non indicato'}` : 'Non programmato'}</h2>
            </div>
          </div>

          <div class="training-summary">
            <div>
              <span>Data</span>
              <strong>${nextTraining ? new Date(nextTraining.startAt).toLocaleDateString('it-IT') : '—'}</strong>
            </div>

            <div>
              <span>Training Sheet</span>
              <strong>${nextTraining?.trainingSheetPath ? 'Presente' : '—'}</strong>
            </div>

            <div>
              <span>MD</span>
              <strong>${nextTraining?.matchDay || 'Nessuno'}</strong>
            </div>
          </div>

          ${nextTraining
            ? `
                <button
                  class="wide-button"
                  type="button"
                  data-open-event="${nextTraining.id}"
                >
                  Apri allenamento
                </button>
              `
            : ''}
        </article>
      </div>
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
                  class="calendar-event calendar-event--${event.type}"
                  data-open-event="${event.id}"
                  type="button"
                >
                  <strong>
                    <span class="calendar-event__icon">
                      ${eventTypeIcon(event.type)}
                    </span>
                    ${event.title}
                  </strong>

                  <span>
                    ${event.time}${eventPlaceLabel(event)}${event.type === 'training' && event.matchDay ? ` · ${event.matchDay}` : ''}
                  </span>
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
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Rosa</h1>

          <p>
            <span>27 GIOCATORI</span>
            <b>•</b>
            Serie D
          </p>
        </div>

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuovo giocatore
        </button>
      </div>

      <div class="players-grid">
        ${players
          .map(
            (player) => `
              <article class="player-card">
                <div class="player-avatar">
                  ${player.initials}
                </div>

                <div class="player-main">
                  <h3>${player.name}</h3>
                  <p>${player.year} · ${player.role}</p>
                </div>

                <div class="player-meta">
                  <span>Piede ${player.foot}</span>

                  <strong
                    class="${
                      player.status === 'Disponibile'
                        ? 'ok'
                        : 'warn'
                    }"
                  >
                    ${player.status}
                  </strong>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function analysisView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Analisi Gare</h1>

          <p>
            <span>VIDEO E CLIP</span>
            <b>•</b>
            Stagione 2026/27
          </p>
        </div>

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuova analisi
        </button>
      </div>

      <div class="analysis-grid">
        ${analysisItems
          .map(
            (analysis) => `
              <article class="analysis-card">
                <div class="video-placeholder">
                  ${icon('analysis')}
                </div>

                <div class="analysis-copy">
                  <span>${analysis.date}</span>
                  <h3>Mezzolara · ${analysis.opponent}</h3>
                  <p>${analysis.clips} clip · ${analysis.tag}</p>
                  <strong>${analysis.status}</strong>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
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
  const metadata = currentUser?.user_metadata ?? {}
  const fullName = metadata.full_name || metadata.name || 'Nicola Zecchi'
  const email = currentUser?.email ?? ''
  const roleLabel = currentUserRole === 'owner' ? 'Amministratore' : 'Osservatore'

  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Il mio profilo</h1>
          <p><span>ACCOUNT PERSONALE</span><b>•</b>${roleLabel}</p>
        </div>
      </div>

      <div class="profile-page-grid">
        <form class="profile-card" data-profile-form>
          <div class="profile-card-head">
            <span class="profile-page-avatar">${fullName.charAt(0).toUpperCase()}</span>
            <div><h2>Dati personali</h2><p>Aggiorna il nome mostrato nel portale.</p></div>
          </div>
          <label class="form-field">
            <span>Nome e cognome</span>
            <input name="full_name" value="${fullName}" autocomplete="name" required>
          </label>
          <label class="form-field">
            <span>Email</span>
            <input value="${email}" type="email" disabled>
          </label>
          <label class="form-field">
            <span>Ruolo</span>
            <input value="${roleLabel}" disabled>
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
        src="${event.trainingSheetUrl}"
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

              <div class="training-sheet-preview-wrap">
                ${trainingSheetPreviewHtml(event)}
              </div>

              ${event.trainingSheetUrl
                ? `
                    <a
                      class="wide-button drawer-sheet-link"
                      href="${event.trainingSheetUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span class="drawer-sheet-link__icon">${icon('sheet')}</span>
                      <span>Apri Training Sheet</span>
                    </a>
                  `
                : ''}
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
            </select>
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

          <div class="new-event-form__row" data-attendance-fields>
            <label>
              Presenti
              <input name="presentCount" type="number" min="0" max="99" inputmode="numeric" placeholder="25">
            </label>
            <label>
              Totale rosa
              <input name="squadTotal" type="number" min="1" max="99" inputmode="numeric" placeholder="28">
            </label>
          </div>

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
              <option value="Mezzolara" ${event.place === 'Mezzolara' ? 'selected' : ''}>
                Mezzolara
              </option>
              <option value="Budrio" ${event.place === 'Budrio' ? 'selected' : ''}>
                Budrio
              </option>
            </select>
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

          <div class="new-event-form__row" data-attendance-fields ${isTrainingEventType(event.type) ? '' : 'hidden'}>
            <label>
              Presenti
              <input name="presentCount" type="number" min="0" max="99" inputmode="numeric" value="${event.presentCount ?? ''}" placeholder="25">
            </label>
            <label>
              Totale rosa
              <input name="squadTotal" type="number" min="1" max="99" inputmode="numeric" value="${event.squadTotal ?? ''}" placeholder="28">
            </label>
          </div>

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
        <span class="user-avatar">
          ${userInitial}
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
          <span class="profile-dropdown-avatar">
            ${userInitial}
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
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || fallbackUserName
  const roleLabel = 'Staff'
  const userInitial =
    userEmail.charAt(0).toUpperCase() || 'N'

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

          ${profileMenuHtml(userInitial, userEmail, userName, roleLabel)}
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

export async function attachAppEvents(user) {
  currentUser = user
  await loadCurrentUserRole(user)
  await loadCalendarEvents()
  
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

  if (key === 'calendar' || key === 'dashboard' || key === 'library') {
    await loadCalendarEvents()
  }

  const views = {
    dashboard: dashboardView,
    calendar: calendarView,
    library: trainingLibraryView,
    squad: squadView,
    analysis: analysisView,
    profile: profileView,
  }

  root.innerHTML = views[key]
    ? views[key]()
    : placeholderView(label)

  bindDynamic()

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
    const attendanceFields = form?.querySelector('[data-attendance-fields]')

    if (!typeSelect || !trainingSheetField) return

    const refresh = () => {
      const showTrainingSheet = isTrainingEventType(typeSelect.value)
      trainingSheetField.hidden = !showTrainingSheet
      if (mdField) mdField.hidden = !showTrainingSheet
      if (attendanceFields) attendanceFields.hidden = !showTrainingSheet

      if (!showTrainingSheet && trainingSheetInput) {
        trainingSheetInput.value = ''
      }

      if (!showTrainingSheet && mdSelect) {
        mdSelect.value = ''
      }
    }

    typeSelect.addEventListener('change', refresh)
    refresh()
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
      const location = String(
        formData.get('location') ?? '',
      ).trim()
      const file = formData.get('trainingSheet')
      const matchDay = isTrainingEventType(eventType)
        ? String(formData.get('matchDay') ?? '').trim() || null
        : null
      const presentCount = isTrainingEventType(eventType) && formData.get('presentCount') !== ''
        ? Number(formData.get('presentCount'))
        : null
      const squadTotal = isTrainingEventType(eventType) && formData.get('squadTotal') !== ''
        ? Number(formData.get('squadTotal'))
        : null

      if (presentCount !== null && squadTotal !== null && presentCount > squadTotal) {
        message.textContent = 'I presenti non possono superare il totale rosa.'
        return
      }

      if (!date || !time) {
        message.textContent = 'Inserisci data e ora.'
        return
      }

      saveButton.disabled = true
      saveButton.textContent = 'Salvataggio...'
      message.textContent = ''

      const eventTitles = {
        training: 'Allenamento',
        match: 'Partita',
        meeting: 'Riunione',
        rest: 'Riposo',
      }

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
          title: eventTitles[eventType] ?? 'Evento',
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
      const location = String(
        formData.get('location') ?? '',
      ).trim()
      const file = formData.get('trainingSheet')
      const matchDay = isTrainingEventType(eventType)
        ? String(formData.get('matchDay') ?? '').trim() || null
        : null
      const presentCount = isTrainingEventType(eventType) && formData.get('presentCount') !== ''
        ? Number(formData.get('presentCount'))
        : null
      const squadTotal = isTrainingEventType(eventType) && formData.get('squadTotal') !== ''
        ? Number(formData.get('squadTotal'))
        : null

      if (presentCount !== null && squadTotal !== null && presentCount > squadTotal) {
        message.textContent = 'I presenti non possono superare il totale rosa.'
        return
      }

      if (!date || !time) {
        message.textContent = 'Inserisci data e ora.'
        return
      }

      saveButton.disabled = true
      saveButton.textContent = 'Salvataggio...'
      message.textContent = ''

      const eventTitles = {
        training: 'Allenamento',
        match: 'Partita',
        meeting: 'Riunione',
        rest: 'Riposo',
      }

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
          title: eventTitles[eventType] ?? 'Evento',
          event_type: eventType,
          start_at: startAt,
          location: location || null,
          match_day: matchDay,
          present_count: presentCount,
          squad_total: squadTotal,
          training_sheet_path: nextFilePath,
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

  function bindDynamic() {
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
      const message = form.querySelector('[data-profile-message]')
      const fullName = new FormData(form).get('full_name')?.toString().trim()
      if (!fullName) return
      const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
      if (error) { message.textContent = error.message; message.className = 'form-message is-error'; return }
      currentUser = data.user
      message.textContent = 'Profilo aggiornato.'
      message.className = 'form-message is-success'
      const topName = document.querySelector('.profile-menu-identity strong')
      const dropName = document.querySelector('.profile-dropdown-head strong')
      if (topName) topName.textContent = fullName
      if (dropName) dropName.textContent = fullName
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
        await setView(sectionKey, sectionLabel)
        closeProfileMenu()
      })
    })

  // Gestione robusta del menu profilo: funziona anche su touch/mobile
  // e non dipende dal punto esatto su cui viene premuto il pulsante.
  const handleProfileMenuToggle = (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggleProfileMenu()
  }

  profileMenuButton?.addEventListener('pointerup', handleProfileMenuToggle)

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

  bindDynamic()
}
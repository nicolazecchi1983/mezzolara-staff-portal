import { icon } from './icons.js'
import { supabase } from '../supabase.js'

import {
  dashboardStats,
  todayItems,
  recentActivity,
  players,
  analysisItems,
} from '../data/appData.js'

let calendarEvents = []

async function loadCalendarEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at')

  if (error) {
    alert(`Errore Supabase: ${error.message}`)
    return
  }

  if (error) {
  alert(`Errore Supabase: ${error.message}`)
  return
}

  calendarEvents = data.map(event => ({
    day: new Date(event.start_at).getDate(),
    title: event.title,
    time: new Date(event.start_at).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    place: event.location,
    type: event.event_type,
    intensity: event.intensity,
    volume: event.volume,
    present: '-',
    sheet: '-',
  }))
}

const menu = [
  ['dashboard', 'Dashboard'],
  ['calendar', 'Calendario'],
  ['sheet', 'Training Sheet'],
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

function statCards() {
  return dashboardStats
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

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuovo elemento
        </button>
      </div>

      <div class="stats-grid">
        ${statCards()}
      </div>

      <div class="dashboard-layout">
        <article class="panel today-panel">
          <div class="panel-head">
            <div>
              <span>OGGI</span>
              <h2>26 Luglio 2026</h2>
            </div>

            <strong>3 attività</strong>
          </div>

          <div class="timeline">
            ${todayItems
              .map(
                (item) => `
                  <div class="timeline-item">
                    <time>${item.time}</time>
                    <i class="${item.type}"></i>

                    <div>
                      <strong>${item.title}</strong>
                      <span>${item.meta}</span>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
        </article>

        <article class="panel quick-panel">
          <div class="panel-head">
            <div>
              <span>PROSSIMO ALLENAMENTO</span>
              <h2>17:30 · Budrio</h2>
            </div>
          </div>

          <div class="training-summary">
            <div>
              <span>Training Sheet</span>
              <strong>AL 004</strong>
            </div>

            <div>
              <span>Presenti</span>
              <strong>26</strong>
            </div>

            <div>
              <span>Intensità</span>
              <strong>5/5</strong>
            </div>

            <div>
              <span>Volume</span>
              <strong>4/5</strong>
            </div>
          </div>

          <button
            class="wide-button"
            type="button"
            data-open-event="26"
          >
            Apri allenamento
          </button>
        </article>

        <article class="panel activity-panel">
          <div class="panel-head">
            <div>
              <span>ATTIVITÀ RECENTI</span>
              <h2>Ultime modifiche</h2>
            </div>
          </div>

          <div class="activity-list">
            ${recentActivity
              .map(
                (activity) => `
                  <div>
                    <strong>${activity.title}</strong>
                    <span>${activity.meta}</span>
                  </div>
                `,
              )
              .join('')}
          </div>
        </article>
      </div>
    </section>
  `
}

function calendarCells() {
  const cells = [
    ...[29, 30].map((day) => ({
      day,
      muted: true,
    })),

    ...Array.from(
      {
        length: 31,
      },
      (_, index) => ({
        day: index + 1,
        muted: false,
      }),
    ),

    ...[1, 2].map((day) => ({
      day,
      muted: true,
    })),
  ]

  return cells
    .map(({ day, muted }) => {
      const event = muted
        ? null
        : calendarEvents.find((item) => item.day === day)

      return `
        <div class="calendar-cell ${muted ? 'is-muted' : ''}">
          <span
            class="day-number ${
              !muted && day === 26 ? 'is-today' : ''
            }"
          >
            ${day}
          </span>

          ${
            event
              ? `
                <button
                  class="calendar-event calendar-event--${event.type}"
                  data-open-event="${day}"
                  type="button"
                >
                  <strong>
                    <i></i>
                    ${event.title}
                  </strong>

                  <span>
                    ${event.time} · ${event.place}
                  </span>
                </button>
              `
              : ''
          }
        </div>
      `
    })
    .join('')
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

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuovo evento
        </button>
      </div>

      <section class="calendar-panel">
        <div class="calendar-toolbar">
          <div>
            <button type="button">‹</button>
            <button type="button">›</button>
            <button type="button">Oggi</button>
          </div>

          <h2>Luglio 2026</h2>

          <div>
            <button class="is-active" type="button">
              Mese
            </button>

            <button type="button">
              Settimana
            </button>

            <button type="button">
              Agenda
            </button>
          </div>
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
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Profilo</h1>

          <p>
            <span>ACCOUNT PERSONALE</span>
            <b>•</b>
            Nicola Zecchi
          </p>
        </div>
      </div>

      <div class="placeholder-panel">
        <h2>Nicola Zecchi</h2>

        <p>
          Qui potrai gestire i dati personali, il ruolo nello staff,
          la foto profilo e le preferenze dell’account.
        </p>
      </div>
    </section>
  `
}

function drawerHtml(event) {
  return `
    <div
      class="drawer-backdrop"
      data-close-drawer
    ></div>

    <aside class="event-drawer">
      <div class="drawer-head">
        <div>
          <span>ALLENAMENTO</span>
          <h2>26 Luglio 2026</h2>
        </div>

        <button
          type="button"
          data-close-drawer
          aria-label="Chiudi"
        >
          ${icon('close')}
        </button>
      </div>

      <div class="drawer-section">
        <label>Orario</label>
        <strong>${event.time}</strong>
        <small>${event.place}</small>
      </div>

      <div class="drawer-grid">
        <div>
          <span>Presenti</span>
          <strong>${event.present}</strong>
        </div>

        <div>
          <span>Training Sheet</span>
          <strong>${event.sheet}</strong>
        </div>

        <div>
          <span>Intensità</span>
          <strong>${event.intensity}/5</strong>
        </div>

        <div>
          <span>Volume</span>
          <strong>${event.volume}/5</strong>
        </div>
      </div>

      <div class="drawer-section">
        <label>Note</label>

        <textarea
          placeholder="Aggiungi note per lo staff..."
        ></textarea>
      </div>

      <div class="drawer-actions">
        <button type="button">
          Carica PNG
        </button>

        <button class="primary-action" type="button">
          Salva modifiche
        </button>
      </div>
    </aside>
  `
}

function profileMenuHtml(userInitial, userEmail) {
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
          <strong>Nicola Zecchi</strong>
          <small>Staff</small>
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
            <strong>Nicola Zecchi</strong>
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

        <button
          class="profile-dropdown-item"
          type="button"
          data-profile-action="settings"
          role="menuitem"
        >
          <span class="profile-dropdown-icon">
            ${icon('settings')}
          </span>

          <span>Impostazioni</span>
        </button>

        <div class="profile-dropdown-separator"></div>

        <button
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
  const userEmail = user.email ?? ''
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

        <button
          id="logoutButton"
          class="logout-button"
          type="button"
        >
          ${icon('logout')}
          <span>Esci</span>
        </button>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="mobile-topbar-brand">
            <span class="mobile-brand-square">
              NZ
            </span>

            <div>
              <strong>NZ</strong>
              <span>Coach Portal</span>
            </div>
          </div>

          ${profileMenuHtml(userInitial, userEmail)}
        </header>

        <main id="viewRoot">
          ${dashboardView()}
        </main>
      </div>

      <div id="drawerRoot"></div>
    </div>
  `
}

export async function attachAppEvents() {
  await loadCalendarEvents()
  
  const root = document.querySelector('#viewRoot')
  const drawerRoot = document.querySelector('#drawerRoot')

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
  if (key === 'calendar') {
    await loadCalendarEvents()
  }

  const views = {
    dashboard: dashboardView,
    calendar: calendarView,
    squad: squadView,
    analysis: analysisView,
    profile: profileView,
  }

  root.innerHTML = views[key]
    ? views[key]()
    : placeholderView(label)

  bindDynamic()
}

  function openDrawer(day) {
    const event = calendarEvents.find(
      (item) => item.day === Number(day),
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
        button.addEventListener('click', () => {
          openDrawer(button.dataset.openEvent)
        })
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

  profileMenuButton?.addEventListener(
    'click',
    (event) => {
      event.stopPropagation()
      toggleProfileMenu()
    },
  )

  profileDropdown?.addEventListener(
    'click',
    (event) => {
      event.stopPropagation()
    },
  )

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

        if (action === 'settings') {
          setActiveNavigation('settings')
          setView('settings', 'Impostazioni')
          closeProfileMenu()
          return
        }

        if (action === 'logout') {
          closeProfileMenu()
          logoutButton?.click()
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
    }
  })

  bindDynamic()
}